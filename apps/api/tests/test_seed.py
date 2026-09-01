"""What this file tests: `app.seed.seed` — the dev/test bring-up routine that
get-or-creates the three demo accounts, imports the seed lessons plus the migrated legacy
content and demo quiz, and seeds the demo cohort/students/attempts/rollups.

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
`app.content.models` (Activity, Lesson); `app.content.activity_models` (Quiz, Outcome,
QuestionOutcome).
Used by: CI `api` job in `.github/workflows/pr.yml`; `make test-api`.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.attempts.models import Attempt
from app.attempts.rollup import ActivityResult
from app.auth.models import User
from app.cohorts.models import Cohort, Enrollment
from app.config import Settings
from app.content.activity_models import Outcome, QuestionOutcome, Quiz
from app.content.models import Activity, Lesson
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
