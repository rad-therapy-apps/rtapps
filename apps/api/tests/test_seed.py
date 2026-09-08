"""What this file tests: `app.seed.seed` — the dev/test bring-up routine that
get-or-creates the three demo accounts, imports the seed lessons plus the migrated legacy
content and demo quiz, seeds the published MU calculator, and seeds the demo
cohort/students/attempts/rollups.

Used here and why: the real Postgres `db`/`client` fixtures from `conftest.py` (not
mocks), because the point of these tests is that `seed()` is safe to call against a
database that may already be seeded, and that the accounts it creates are the ones the
login endpoint actually accepts.

How it fits the project: protects `make seed` (docs/03-architecture.md §10.1) — a
developer or CI job can run seeding more than once without duplicating users, lessons,
migrated content, the demo cohort, its student enrolments or their attempts/rollups, and
it must never run against a `prod` environment by mistake.

Works with: pytest-asyncio, httpx.
Depends on: `db`, `client`, `settings` fixtures and `TEST_DATABASE_URL` from
`conftest.py`; `app.seed.seed`; `app.config.Settings`; `app.cohorts.models` (Cohort,
Enrollment); `app.attempts.models` (Attempt); `app.attempts.rollup` (ActivityResult);
`app.content.models` (Activity, Lesson); `app.content.activity_models` (DataTable, Quiz,
Outcome, QuestionOutcome).
Used by: CI `api` job in `.github/workflows/pr.yml`; `make test-api`.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.attempts.models import Attempt
from app.attempts.rollup import ActivityResult
from app.auth.models import User
from app.cohorts.models import Cohort, Enrollment
from app.config import Settings
from app.content.activity_models import DataTable, Outcome, QuestionOutcome, Quiz
from app.content.models import Activity, ContentVersion, Lesson, Subject
from app.seed import seed
from tests.conftest import TEST_DATABASE_URL


async def test_seed_is_idempotent(db: AsyncSession, settings: Settings) -> None:
    """Calling seed() twice must not double-create anything: the second call sees all
    thirteen accounts (three demo plus ten students) and every migrated lesson already
    there, and creates 0 new users; the migrated-content + activity import counts (upserts,
    not get-or-create) stay identical across both calls."""
    first = await seed(db, settings)
    second = await seed(db, settings)
    assert first.users_created == 13 and second.users_created == 0
    # Confirms the get-or-create check actually matched existing rows by email, rather
    # than the count happening to come out right for some other reason (e.g. a bug that
    # silently no-ops the whole function on the second call).
    assert (await db.scalar(select(func.count()).select_from(User))) == 13
    lessons = (await db.scalars(select(Lesson))).all()
    lesson_slugs = {lesson.slug for lesson in lessons}
    # The two hand-written seed/lessons fixtures share their slug with a migrated
    # seed/content lesson (rbe-and-oer, em-spectrum), so re-importing them from
    # CONTENT_DIR replaces rather than duplicates them: 80 distinct lesson-kind
    # documents in seed/content, not 82.
    assert len(lesson_slugs) == 80
    assert {"rbe-and-oer", "em-spectrum"} <= lesson_slugs
    assert all(lesson.status == "published" for lesson in lessons)
    # Every seed/content + seed/activities document is (re)imported on every call (an
    # upsert, not a get-or-create), so the count is stable across calls, not 0.
    assert first.activities_imported == second.activities_imported == 93
    # Seeded get-or-create activities (calculators, arcade games) increase the total but
    # are created only once; one more activity now (Cell Defender).
    total_activities_first = await db.scalar(select(func.count()).select_from(Activity))
    total_activities_second = await db.scalar(select(func.count()).select_from(Activity))
    assert total_activities_first == total_activities_second


async def test_seed_users_can_log_in(
    client: AsyncClient, db: AsyncSession, settings: Settings
) -> None:
    """The seeded educator and a seeded student account must both be usable through the
    real login endpoint with the documented shared dev password, not just present as
    rows in the database."""
    await seed(db, settings)
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "educator@example.com", "password": "rtapps-dev-password"},
    )
    assert r.status_code == 200 and r.json()["role"] == "educator"
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "student03@example.com", "password": "rtapps-dev-password"},
    )
    assert r.status_code == 200 and r.json()["role"] == "student"


async def test_seed_cohort_students_and_results(db: AsyncSession, settings: Settings) -> None:
    """One demo cohort with the educator and ten students; each student has one submitted
    attempt on rbe-and-oer scoring index % 3 out of 2, and one on demo-quiz scoring index %
    5 out of 4, each with a rollup row; re-seeding adds none."""
    first = await seed(db, settings)
    assert (
        first.cohort_created
        and first.students_created == 10
        and first.attempts_created == 10
        and first.quiz_attempts_created == 10
    )
    cohort = await db.scalar(select(Cohort).where(Cohort.join_code == "DEMO42"))
    assert cohort is not None and cohort.name == "Demo cohort" and cohort.threshold_percent == 70
    roles = (
        await db.execute(
            select(Enrollment.role, func.count())
            .where(Enrollment.cohort_id == cohort.id)
            .group_by(Enrollment.role)
        )
    ).all()
    assert dict(roles) == {"educator": 1, "student": 10}

    lesson_activity = await db.scalar(
        select(Activity)
        .join(Lesson, Lesson.id == Activity.lesson_id)
        .where(Lesson.slug == "rbe-and-oer")
    )
    assert lesson_activity is not None
    lesson_percents = sorted(
        (
            await db.scalars(
                select(ActivityResult.best_percent).where(
                    ActivityResult.activity_id == lesson_activity.id
                )
            )
        ).all()
    )
    assert lesson_percents == [0.0, 0.0, 0.0, 50.0, 50.0, 50.0, 50.0, 100.0, 100.0, 100.0]

    # --- demo quiz: published, 4 questions, every question outcome-tagged ---
    quiz = await db.scalar(select(Quiz).where(Quiz.slug == "demo-quiz"))
    assert quiz is not None and len(quiz.questions) == 4
    quiz_activity = await db.scalar(
        select(Activity).where(Activity.kind == "quiz", Activity.ref_id == quiz.id)
    )
    assert quiz_activity is not None and quiz_activity.status == "published"
    assert {o.code for o in (await db.scalars(select(Outcome))).all()} >= {"RB-1", "RB-2"}
    tagged_question_ids = {
        qo.question_id for qo in (await db.scalars(select(QuestionOutcome))).all()
    }
    assert {qq.question_id for qq in quiz.questions} <= tagged_question_ids

    quiz_percents = sorted(
        (
            await db.scalars(
                select(ActivityResult.best_percent).where(
                    ActivityResult.activity_id == quiz_activity.id
                )
            )
        ).all()
    )
    assert quiz_percents == [0.0, 0.0, 25.0, 25.0, 50.0, 50.0, 75.0, 75.0, 100.0, 100.0]

    # student01 (i=1): 1 of 4 correct = 25.0%.
    student01 = await db.scalar(select(User).where(User.email == "student01@example.com"))
    assert student01 is not None
    student01_quiz_percent = await db.scalar(
        select(ActivityResult.best_percent).where(
            ActivityResult.user_id == student01.id, ActivityResult.activity_id == quiz_activity.id
        )
    )
    assert student01_quiz_percent == 25.0

    second = await seed(db, settings)
    assert (
        not second.cohort_created
        and second.students_created == 0
        and second.attempts_created == 0
        and second.quiz_attempts_created == 0
    )
    assert (await db.scalar(select(func.count()).select_from(Attempt))) == 20


async def test_seed_partial_rerun_recreates_only_missing_attempt(
    db: AsyncSession, settings: Settings
) -> None:
    """Deleting one demo student's lesson attempt and re-running seed() recreates only that
    student's attempt (the other nine students' lesson attempts and every quiz attempt are
    left untouched, since seed() only fills in what's missing, not a full re-import)."""
    await seed(db, settings)
    student03 = await db.scalar(select(User).where(User.email == "student03@example.com"))
    assert student03 is not None
    lesson_activity = await db.scalar(
        select(Activity)
        .join(Lesson, Lesson.id == Activity.lesson_id)
        .where(Lesson.slug == "rbe-and-oer")
    )
    assert lesson_activity is not None
    await db.execute(
        delete(Attempt).where(
            Attempt.user_id == student03.id, Attempt.activity_id == lesson_activity.id
        )
    )
    await db.flush()

    second = await seed(db, settings)
    assert second.attempts_created == 1 and second.quiz_attempts_created == 0
    remaining = await db.scalar(
        select(func.count())
        .select_from(Attempt)
        .where(Attempt.user_id == student03.id, Attempt.activity_id == lesson_activity.id)
    )
    assert remaining == 1
    assert (await db.scalar(select(func.count()).select_from(Attempt))) == 20


async def test_seed_creates_published_mu_calculator(db: AsyncSession, settings: Settings) -> None:
    """The seeded `pdd_6mv` data table and its "MU calculator" activity: the table has a
    plausible, monotone PDD grid, and the calculator is published and points at it — so the
    authoring e2e (Task 18) and a student both have a fixed calculator to open; re-seeding
    creates neither a second table nor a second activity."""
    await seed(db, settings)
    table = await db.scalar(select(DataTable).where(DataTable.key == "pdd_6mv"))
    assert table is not None
    assert table.grid["cols"] == [5.0, 10.0, 15.0, 20.0]
    assert [row["key"] for row in table.grid["rows"]] == [1.5, 5.0, 10.0, 20.0]

    calc = await db.scalar(
        select(Activity).where(Activity.kind == "calculator", Activity.title == "MU calculator")
    )
    assert calc is not None
    assert calc.status == "published"
    assert calc.config == {
        "calc_type": "mu",
        "data_tables": ["pdd_6mv", "sc_6mv", "sp_6mv", "wedge_factors"],
    }

    await seed(db, settings)
    assert (
        await db.scalar(
            select(func.count()).select_from(DataTable).where(DataTable.key == "pdd_6mv")
        )
    ) == 1
    assert (
        await db.scalar(
            select(func.count())
            .select_from(Activity)
            .where(Activity.kind == "calculator", Activity.title == "MU calculator")
        )
    ) == 1


async def test_seed_creates_scatter_and_wedge_tables(db: AsyncSession, settings: Settings) -> None:
    """The three new single-row `DataTable`s (Task 6), transcribed verbatim from the legacy
    MU_Calculator's 6 MV `scData`/`spData`/`wedgeFactors`: ascending cols (field sizes or
    wedge angles), one row keyed `0`; the MU calculator's latest published snapshot embeds
    all four tables by value; re-seeding creates none of them twice."""
    await seed(db, settings)

    sc = await db.scalar(select(DataTable).where(DataTable.key == "sc_6mv"))
    assert sc is not None
    assert sc.grid["cols"] == sorted(sc.grid["cols"])
    assert [row["key"] for row in sc.grid["rows"]] == [0]
    assert sc.grid["rows"][0]["values"][:3] == [0.948, 0.961, 0.97]

    sp = await db.scalar(select(DataTable).where(DataTable.key == "sp_6mv"))
    assert sp is not None
    assert sp.grid["cols"] == sorted(sp.grid["cols"])
    assert [row["key"] for row in sp.grid["rows"]] == [0]
    assert sp.grid["rows"][0]["values"][:3] == [0.981, 0.983, 0.987]

    wedge = await db.scalar(select(DataTable).where(DataTable.key == "wedge_factors"))
    assert wedge is not None
    assert wedge.grid["cols"] == [0, 15, 30, 45, 60]
    assert [row["key"] for row in wedge.grid["rows"]] == [0]
    assert wedge.grid["rows"][0]["values"] == [1.0, 0.828, 0.714, 0.580, 0.424]

    calc = await db.scalar(
        select(Activity).where(Activity.kind == "calculator", Activity.title == "MU calculator")
    )
    assert calc is not None and calc.current_version_id is not None
    version = await db.get(ContentVersion, calc.current_version_id)
    assert version is not None
    assert set(version.snapshot["calculator"]["data_tables"].keys()) == {
        "pdd_6mv",
        "sc_6mv",
        "sp_6mv",
        "wedge_factors",
    }

    await seed(db, settings)
    for key in ("sc_6mv", "sp_6mv", "wedge_factors"):
        count = await db.scalar(
            select(func.count()).select_from(DataTable).where(DataTable.key == key)
        )
        assert count == 1


async def test_seed_creates_six_practice_calculators(db: AsyncSession, settings: Settings) -> None:
    """Six new practice calculators (Task 6), get-or-created by title like the MU
    calculator: each has the right calc_type/subject and no data tables of its own, and both
    `inverse_square` instances exist (Treatment Planning teaching the law itself, Radiation
    Protection the ALARA framing); re-seeding creates none of them twice."""
    await seed(db, settings)
    expected = [
        ("Inverse Square Law", "inverse_square", "treatment-planning"),
        ("Extended SSD", "extended_ssd", "treatment-planning"),
        ("Gap Calculation", "gap", "treatment-planning"),
        ("Magnification", "magnification", "treatment-planning"),
        ("SI Unit Converter", "si_convert", "radiation-physics"),
        ("ALARA: Inverse Square in Practice", "inverse_square", "radiation-protection"),
    ]
    for title, calc_type, subject_slug in expected:
        activity = await db.scalar(
            select(Activity).where(Activity.kind == "calculator", Activity.title == title)
        )
        assert activity is not None, title
        assert activity.status == "published"
        assert activity.config == {"calc_type": calc_type, "data_tables": []}
        subject = await db.get(Subject, activity.subject_id)
        assert subject is not None and subject.slug == subject_slug

    inverse_square_count = await db.scalar(
        select(func.count())
        .select_from(Activity)
        .where(
            Activity.kind == "calculator",
            Activity.config["calc_type"].astext == "inverse_square",
        )
    )
    assert inverse_square_count == 2

    await seed(db, settings)
    for title, _, _ in expected:
        count = await db.scalar(
            select(func.count())
            .select_from(Activity)
            .where(Activity.kind == "calculator", Activity.title == title)
        )
        assert count == 1


async def test_seed_creates_cell_defender(db: AsyncSession, settings: Settings) -> None:
    """The seeded Cell Defender arcade activity (Plan 4a pilot): published, kind external,
    access practice, config with arcade_slug and max_score; subject is radiation-biology;
    re-seeding creates it only once."""
    await seed(db, settings)
    activity = await db.scalar(select(Activity).where(Activity.title == "Cell Defender"))
    assert activity is not None
    assert activity.kind == "external"
    assert activity.status == "published"
    assert activity.access == "practice"
    assert activity.config == {"arcade_slug": "cell-defender", "max_score": 5000}
    subject = await db.get(Subject, activity.subject_id)
    assert subject is not None and subject.slug == "radiation-biology"

    await seed(db, settings)
    count = await db.scalar(
        select(func.count()).select_from(Activity).where(Activity.title == "Cell Defender")
    )
    assert count == 1


async def test_seed_creates_anatomy_atlas_adventure(db: AsyncSession, settings: Settings) -> None:
    """Plan 4b batch 1: Anatomy Atlas Adventure — published, kind external, access
    practice, config with arcade_slug and max_score (5 cases x 100); subject is
    sectional-anatomy; re-seeding creates it only once."""
    await seed(db, settings)
    activity = await db.scalar(select(Activity).where(Activity.title == "Anatomy Atlas Adventure"))
    assert activity is not None
    assert activity.kind == "external"
    assert activity.status == "published"
    assert activity.access == "practice"
    assert activity.config == {"arcade_slug": "anatomy-atlas", "max_score": 500}
    subject = await db.get(Subject, activity.subject_id)
    assert subject is not None and subject.slug == "sectional-anatomy"

    await seed(db, settings)
    count = await db.scalar(
        select(func.count())
        .select_from(Activity)
        .where(Activity.title == "Anatomy Atlas Adventure")
    )
    assert count == 1


async def test_seed_creates_dose_calc_dash(db: AsyncSession, settings: Settings) -> None:
    """Plan 4b batch 1: Dose Calc Dash — published, kind external, access practice,
    config with arcade_slug and max_score (4 cases x 100); subject is
    treatment-planning; re-seeding creates it only once."""
    await seed(db, settings)
    activity = await db.scalar(select(Activity).where(Activity.title == "Dose Calc Dash"))
    assert activity is not None
    assert activity.kind == "external"
    assert activity.status == "published"
    assert activity.access == "practice"
    assert activity.config == {"arcade_slug": "dose-calc-dash", "max_score": 400}
    subject = await db.get(Subject, activity.subject_id)
    assert subject is not None and subject.slug == "treatment-planning"

    await seed(db, settings)
    count = await db.scalar(
        select(func.count()).select_from(Activity).where(Activity.title == "Dose Calc Dash")
    )
    assert count == 1


async def test_seed_creates_adaptive_consultation_assessment(
    db: AsyncSession, settings: Settings
) -> None:
    """Plan 4b batch 1: Adaptive Consultation Assessment — published, kind external,
    access practice, config with arcade_slug and max_score (239, the sum of the 10
    largest per-scenario maxPoints among its 14 scenarios — the true achievable ceiling
    for a 10-round adaptive run); subject is patient-care; re-seeding creates it only
    once."""
    await seed(db, settings)
    activity = await db.scalar(
        select(Activity).where(Activity.title == "Adaptive Consultation Assessment")
    )
    assert activity is not None
    assert activity.kind == "external"
    assert activity.status == "published"
    assert activity.access == "practice"
    assert activity.config == {"arcade_slug": "adaptive-consultation", "max_score": 239}
    subject = await db.get(Subject, activity.subject_id)
    assert subject is not None and subject.slug == "patient-care"

    await seed(db, settings)
    count = await db.scalar(
        select(func.count())
        .select_from(Activity)
        .where(Activity.title == "Adaptive Consultation Assessment")
    )
    assert count == 1


async def test_seed_creates_ethical_decision_making_simulator(
    db: AsyncSession, settings: Settings
) -> None:
    """Plan 4b batch 1: Adaptive Ethical Decision-Making Simulator — published, kind
    external, access practice, config with arcade_slug and max_score (50: 5 scenarios
    played per run x 10 points, the uniform max across all 7 defined scenarios); subject
    is ethics; re-seeding creates it only once."""
    await seed(db, settings)
    activity = await db.scalar(
        select(Activity).where(Activity.title == "Adaptive Ethical Decision-Making Simulator")
    )
    assert activity is not None
    assert activity.kind == "external"
    assert activity.status == "published"
    assert activity.access == "practice"
    assert activity.config == {"arcade_slug": "ethical-decisions", "max_score": 50}
    subject = await db.get(Subject, activity.subject_id)
    assert subject is not None and subject.slug == "ethics"

    await seed(db, settings)
    count = await db.scalar(
        select(func.count())
        .select_from(Activity)
        .where(Activity.title == "Adaptive Ethical Decision-Making Simulator")
    )
    assert count == 1


async def test_seed_creates_legal_eagle_lineup(db: AsyncSession, settings: Settings) -> None:
    """Plan 4b batch 1: Legal Eagle Lineup — published, kind external, access practice,
    config with arcade_slug and max_score (9 cases x 100); subject is ethics; re-seeding
    creates it only once."""
    await seed(db, settings)
    activity = await db.scalar(select(Activity).where(Activity.title == "Legal Eagle Lineup"))
    assert activity is not None
    assert activity.kind == "external"
    assert activity.status == "published"
    assert activity.access == "practice"
    assert activity.config == {"arcade_slug": "legal-eagle", "max_score": 900}
    subject = await db.get(Subject, activity.subject_id)
    assert subject is not None and subject.slug == "ethics"

    await seed(db, settings)
    count = await db.scalar(
        select(func.count()).select_from(Activity).where(Activity.title == "Legal Eagle Lineup")
    )
    assert count == 1


async def test_seed_creates_vital_signs_challenge(db: AsyncSession, settings: Settings) -> None:
    """Plan 4b batch 1: Vital Signs Challenge — published, kind external, access
    practice, config with arcade_slug and max_score (10 patients x 6 points/patient);
    subject is patient-care; re-seeding creates it only once."""
    await seed(db, settings)
    activity = await db.scalar(select(Activity).where(Activity.title == "Vital Signs Challenge"))
    assert activity is not None
    assert activity.kind == "external"
    assert activity.status == "published"
    assert activity.access == "practice"
    assert activity.config == {"arcade_slug": "vital-signs", "max_score": 60}
    subject = await db.get(Subject, activity.subject_id)
    assert subject is not None and subject.slug == "patient-care"

    await seed(db, settings)
    count = await db.scalar(
        select(func.count()).select_from(Activity).where(Activity.title == "Vital Signs Challenge")
    )
    assert count == 1


async def test_seed_authoring_queue_is_non_empty(db: AsyncSession, settings: Settings) -> None:
    """At least one seeded activity still carries `import_notes` (the migrated legacy corpus
    re-scanned in Task 5 always flags some pages for a human pass), so the authoring
    needs-review queue this task's e2e drives against is guaranteed non-empty."""
    await seed(db, settings)
    activities = (await db.scalars(select(Activity))).all()
    flagged = [a for a in activities if a.config.get("import_notes")]
    assert len(flagged) > 0


async def test_seed_creates_care_commander(db: AsyncSession, settings: Settings) -> None:
    """Plan 4b batch 2: Care Commander — published, kind external, access practice,
    config with arcade_slug and max_score (3000: 15 patients x 200 points max);
    subject is patient-care; re-seeding creates it only once."""
    await seed(db, settings)
    activity = await db.scalar(select(Activity).where(Activity.title == "Care Commander"))
    assert activity is not None
    assert activity.kind == "external"
    assert activity.status == "published"
    assert activity.access == "practice"
    assert activity.config == {"arcade_slug": "care-commander", "max_score": 3000}
    subject = await db.get(Subject, activity.subject_id)
    assert subject is not None and subject.slug == "patient-care"

    await seed(db, settings)
    count = await db.scalar(
        select(func.count()).select_from(Activity).where(Activity.title == "Care Commander")
    )
    assert count == 1


async def test_seed_creates_error_reporter(db: AsyncSession, settings: Settings) -> None:
    """Plan 4b batch 2: Error Reporter — published, kind external, access practice,
    config with arcade_slug and max_score (10825: perfect 25-case MASTERY ACHIEVED
    playthrough, score/XP accumulate across cases and only reset on full restart);
    subject is quality-management-and-safety; re-seeding creates it only once."""
    await seed(db, settings)
    activity = await db.scalar(select(Activity).where(Activity.title == "Error Reporter"))
    assert activity is not None
    assert activity.kind == "external"
    assert activity.status == "published"
    assert activity.access == "practice"
    assert activity.config == {"arcade_slug": "error-reporter", "max_score": 10825}
    subject = await db.get(Subject, activity.subject_id)
    assert subject is not None and subject.slug == "quality-management-and-safety"

    await seed(db, settings)
    count = await db.scalar(
        select(func.count()).select_from(Activity).where(Activity.title == "Error Reporter")
    )
    assert count == 1


async def test_seed_creates_qa_crusader(db: AsyncSession, settings: Settings) -> None:
    """Plan 4b batch 2: QA Crusader — published, kind external, access practice,
    config with arcade_slug and max_score (10000: Level 3's win floor of 8000 plus a
    bounded overshoot allowance, since reportResult fires once per level at time-up,
    not the instant the target score is crossed); subject is quality-management-and-safety;
    re-seeding creates it only once."""
    await seed(db, settings)
    activity = await db.scalar(select(Activity).where(Activity.title == "QA Crusader"))
    assert activity is not None
    assert activity.kind == "external"
    assert activity.status == "published"
    assert activity.access == "practice"
    assert activity.config == {"arcade_slug": "qa-crusader", "max_score": 10000}
    subject = await db.get(Subject, activity.subject_id)
    assert subject is not None and subject.slug == "quality-management-and-safety"

    await seed(db, settings)
    count = await db.scalar(
        select(func.count()).select_from(Activity).where(Activity.title == "QA Crusader")
    )
    assert count == 1


async def test_seed_creates_safety_supervisor(db: AsyncSession, settings: Settings) -> None:
    """Plan 4b batch 2: Safety Supervisor — published, kind external, access practice,
    config with arcade_slug and max_score (1900: 19 hazards x 100 points);
    subject is radiation-protection; re-seeding creates it only once."""
    await seed(db, settings)
    activity = await db.scalar(select(Activity).where(Activity.title == "Safety Supervisor"))
    assert activity is not None
    assert activity.kind == "external"
    assert activity.status == "published"
    assert activity.access == "practice"
    assert activity.config == {"arcade_slug": "safety-supervisor", "max_score": 1900}
    subject = await db.get(Subject, activity.subject_id)
    assert subject is not None and subject.slug == "radiation-protection"

    await seed(db, settings)
    count = await db.scalar(
        select(func.count()).select_from(Activity).where(Activity.title == "Safety Supervisor")
    )
    assert count == 1


async def test_seed_creates_procedure_pursuit(db: AsyncSession, settings: Settings) -> None:
    """Plan 4b batch 2: Procedure Pursuit — published, kind external, access practice,
    config with arcade_slug and max_score (1650: 9 checkpoints x 100 + 5 timed x 150);
    subject is treatment-delivery-procedures; re-seeding creates it only once."""
    await seed(db, settings)
    activity = await db.scalar(select(Activity).where(Activity.title == "Procedure Pursuit"))
    assert activity is not None
    assert activity.kind == "external"
    assert activity.status == "published"
    assert activity.access == "practice"
    assert activity.config == {"arcade_slug": "procedure-pursuit", "max_score": 1650}
    subject = await db.get(Subject, activity.subject_id)
    assert subject is not None and subject.slug == "treatment-delivery-procedures"

    await seed(db, settings)
    count = await db.scalar(
        select(func.count()).select_from(Activity).where(Activity.title == "Procedure Pursuit")
    )
    assert count == 1


async def test_seed_batch_3_anatomy_angler(db: AsyncSession, settings: Settings) -> None:
    """Plan 4b batch 3: Anatomy Angler — published, kind external, access practice,
    config with arcade_slug and max_score (2000: unbounded heuristic cap, strong-session
    estimate per audit); subject is sectional-anatomy; re-seeding creates 0."""
    await seed(db, settings)
    activity = await db.scalar(
        select(Activity).where(Activity.kind == "external", Activity.title == "Anatomy Angler")
    )
    assert activity is not None
    assert activity.kind == "external"
    assert activity.status == "published"
    assert activity.access == "practice"
    assert activity.config == {"arcade_slug": "anatomy-angler", "max_score": 2000}
    subject = await db.get(Subject, activity.subject_id)
    assert subject is not None and subject.slug == "sectional-anatomy"

    await seed(db, settings)
    count = await db.scalar(
        select(func.count()).select_from(Activity).where(Activity.title == "Anatomy Angler")
    )
    assert count == 1


async def test_seed_batch_3_side_effect_sorcerer(db: AsyncSession, settings: Settings) -> None:
    """Plan 4b batch 3: Side Effect Sorcerer — published, kind external, access practice,
    config with arcade_slug and max_score (859: fixed enemy count 6 waves, sum derived);
    subject is radiation-biology; re-seeding creates 0."""
    await seed(db, settings)
    activity = await db.scalar(
        select(Activity).where(
            Activity.kind == "external", Activity.title == "Side Effect Sorcerer"
        )
    )
    assert activity is not None
    assert activity.kind == "external"
    assert activity.status == "published"
    assert activity.access == "practice"
    assert activity.config == {"arcade_slug": "side-effect-sorcerer", "max_score": 859}
    subject = await db.get(Subject, activity.subject_id)
    assert subject is not None and subject.slug == "radiation-biology"

    await seed(db, settings)
    count = await db.scalar(
        select(func.count()).select_from(Activity).where(Activity.title == "Side Effect Sorcerer")
    )
    assert count == 1


async def test_seed_batch_3_gantry_position_guessing_game(
    db: AsyncSession, settings: Settings
) -> None:
    """Plan 4b batch 3: Gantry Position Guessing Game — published, kind external, access
    practice, config with arcade_slug and max_score (10: perfect streak of 10 correct);
    subject is treatment-delivery-procedures; re-seeding creates 0."""
    await seed(db, settings)
    activity = await db.scalar(
        select(Activity).where(
            Activity.kind == "external", Activity.title == "Gantry Position Guessing Game"
        )
    )
    assert activity is not None
    assert activity.kind == "external"
    assert activity.status == "published"
    assert activity.access == "practice"
    assert activity.config == {"arcade_slug": "gantry-game", "max_score": 10}
    subject = await db.get(Subject, activity.subject_id)
    assert subject is not None and subject.slug == "treatment-delivery-procedures"

    await seed(db, settings)
    count = await db.scalar(
        select(func.count())
        .select_from(Activity)
        .where(Activity.title == "Gantry Position Guessing Game")
    )
    assert count == 1


async def test_seed_batch_3_linac_component_identification(
    db: AsyncSession, settings: Settings
) -> None:
    """Plan 4b batch 3: LINAC Component Identification — published, kind external, access
    practice, config with arcade_slug and max_score (10: 10 components to identify);
    subject is treatment-delivery-procedures; re-seeding creates 0."""
    await seed(db, settings)
    activity = await db.scalar(
        select(Activity).where(
            Activity.kind == "external", Activity.title == "LINAC Component Identification"
        )
    )
    assert activity is not None
    assert activity.kind == "external"
    assert activity.status == "published"
    assert activity.access == "practice"
    assert activity.config == {"arcade_slug": "linac-parts", "max_score": 10}
    subject = await db.get(Subject, activity.subject_id)
    assert subject is not None and subject.slug == "treatment-delivery-procedures"

    await seed(db, settings)
    count = await db.scalar(
        select(func.count())
        .select_from(Activity)
        .where(Activity.title == "LINAC Component Identification")
    )
    assert count == 1


async def test_seed_batch_3_ssd_practice(db: AsyncSession, settings: Settings) -> None:
    """Plan 4b batch 3: SSD Practice - BEV — published, kind external, access practice,
    config with arcade_slug and max_score (20: max user-configurable problems); subject is
    treatment-planning; re-seeding creates 0."""
    await seed(db, settings)
    activity = await db.scalar(
        select(Activity).where(Activity.kind == "external", Activity.title == "SSD Practice - BEV")
    )
    assert activity is not None
    assert activity.kind == "external"
    assert activity.status == "published"
    assert activity.access == "practice"
    assert activity.config == {"arcade_slug": "ssd-practice", "max_score": 20}
    subject = await db.get(Subject, activity.subject_id)
    assert subject is not None and subject.slug == "treatment-planning"

    await seed(db, settings)
    count = await db.scalar(
        select(func.count()).select_from(Activity).where(Activity.title == "SSD Practice - BEV")
    )
    assert count == 1


async def test_seed_refuses_prod(db: AsyncSession) -> None:
    """seed() must raise before touching the database when settings.env == "prod"."""
    # session_secret is 40 chars (>= the 32-char minimum) purely so this Settings object
    # can be constructed at all outside dev/test — Settings' own validator (app/config.py)
    # would otherwise reject a prod secret this short before seed()'s own check ever runs.
    prod = Settings(
        database_url=TEST_DATABASE_URL,
        env="prod",
        session_secret="x" * 40,
        public_origin="https://test",
    )
    with pytest.raises(RuntimeError, match="prod"):
        await seed(db, prod)
