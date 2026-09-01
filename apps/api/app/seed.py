"""Development seed data: creates the three demo accounts, imports seed lessons plus the
migrated legacy content and hand-written activity fixtures, and seeds a demo cohort of ten
students with graded attempts and rollups on both a lesson and a quiz.

What this file does: `seed()` get-or-creates an admin/educator/student account (all
sharing one dev password) and imports every JSON lesson fixture in `seed/lessons/`,
publishing each one; it then imports every document under `seed/content/` (the migrated
legacy corpus) and `seed/activities/` (hand-written fixtures, e.g. the demo quiz) via
`import_any`; it then get-or-creates a demo cohort owned by the educator, enrols ten
student accounts in it, and gives each student one submitted attempt (with rollup) on the
`rbe-and-oer` lesson and one on the `demo-quiz` activity. `main()` is the CLI entry point
that runs this against a real database and commits.

Used here and why: plain SQLAlchemy `select`/`add`/`flush` (no ORM merge helpers) so the
get-or-create logic and what gets committed stay explicit; refuses to run at all when
`settings.env == "prod"`, as a safety net against seeding demo accounts into production.
Each student's score is deterministic (`i % 3` correct out of the lesson's two knowledge
checks, `i % 5` correct out of the quiz's four questions) so the demo cohort has a fixed,
predictable spread of pass/fail results to click through in the educator UI.

How it fits the project: this is `make seed` from `docs/03-architecture.md` §10.1 (dev
environment bring-up) — it gives a fresh dev/test database a login-able admin, educator and
student, the full migrated content library to click through, and a demo cohort with real
attempt/rollup data so the educator analytics views have something to show.

Depends on: `app.attempts.models` (Attempt, AttemptItem), `app.attempts.rollup`
(upsert_activity_result), `app.auth.models` (User, UserRole), `app.auth.passwords`
(hash_password), `app.cohorts.models` (Cohort, Enrollment), `app.config`,
`app.content.importer` (LessonImport, import_lesson), `app.content.activity_importer`
(import_any), `app.content.activity_models` (Quiz), `app.content.activity_snapshots`
(gradeable_items), `app.content.models` (Activity, ContentVersion, Lesson),
`app.content.snapshot` (knowledge_checks), `app.db`, `app.grading.single_choice`
(grade_single_choice).
Used by: `tests/test_seed.py` (`seed`); run directly as a script by `make seed`.
"""

import asyncio
import json
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.attempts.models import Attempt, AttemptItem
from app.attempts.rollup import upsert_activity_result
from app.auth.models import User, UserRole
from app.auth.passwords import hash_password
from app.cohorts.models import Cohort, Enrollment
from app.config import Settings, load_settings
from app.content.activity_importer import import_any
from app.content.activity_models import Quiz
from app.content.activity_snapshots import gradeable_items
from app.content.importer import LessonImport, import_lesson
from app.content.models import Activity, ContentVersion, Lesson
from app.content.snapshot import knowledge_checks
from app.db import get_engine, make_session_factory
from app.grading.single_choice import grade_single_choice

SEED_PASSWORD = "rtapps-dev-password"  # shared by all three demo accounts (dev/test only)
SEED_USERS: list[tuple[str, str, UserRole]] = [
    ("admin@example.com", "Admin", UserRole.admin),
    ("educator@example.com", "Educator", UserRole.educator),
    ("student@example.com", "Student", UserRole.student),
]
LESSON_DIR = Path(__file__).resolve().parents[1] / "seed/lessons"  # JSON lesson fixtures to import
CONTENT_DIR = Path(__file__).resolve().parents[1] / "seed/content"  # migrated legacy corpus
ACTIVITY_DIR = Path(__file__).resolve().parents[1] / "seed/activities"  # hand-written fixtures
SEED_COHORT_NAME = "Demo cohort"  # the one demo cohort every seeded educator can see
SEED_JOIN_CODE = "DEMO42"  # fixed (not random) so it's get-or-create-able across reruns
SEED_STUDENT_COUNT = 10  # how many demo students are enrolled and given an attempt
SEED_LESSON_SLUG = "rbe-and-oer"  # the lesson the demo students attempt (has 2 knowledge checks)
SEED_QUIZ_SLUG = "demo-quiz"  # the quiz the demo students attempt (has 4 questions)


@dataclass
class SeedSummary:
    # Small return value so callers (and the CLI's final print) know what actually
    # changed, since seed() is safe to re-run and most rows will already exist after the
    # first run.
    users_created: int
    lessons_imported: int
    activities_imported: int
    students_created: int
    attempts_created: int
    quiz_attempts_created: int
    cohort_created: bool


async def seed(db: AsyncSession, settings: Settings) -> SeedSummary:
    """Get-or-create the dev accounts and (re)import every seed lesson. Does not commit."""
    if settings.env == "prod":
        raise RuntimeError("refusing to seed a prod environment")

    users_created = 0
    password_hash = hash_password(SEED_PASSWORD)  # hash once, reuse for all three demo users
    for email, display_name, role in SEED_USERS:
        # Get-or-create: re-running seed() against an already-seeded database is a no-op
        # for existing accounts rather than raising a unique-constraint error.
        user = await db.scalar(select(User).where(User.email == email))
        if user is None:
            db.add(
                User(
                    email=email,
                    display_name=display_name,
                    role=role,
                    password_hash=password_hash,
                )
            )
            users_created += 1
    await db.flush()  # assign ids / surface constraint errors before importing lessons

    lessons_imported = 0
    for path in sorted(LESSON_DIR.glob("*.json")):
        # Every fixture is imported and published immediately; seed data has no draft phase.
        doc = LessonImport.model_validate(json.loads(path.read_text()))
        await import_lesson(db, doc, publish=True)
        lessons_imported += 1

    activities_imported = 0
    # Migrated legacy content + hand-written activity fixtures, both idempotent upserts.
    for directory in (CONTENT_DIR, ACTIVITY_DIR):
        for path in sorted(directory.rglob("*.json")):
            await import_any(db, json.loads(path.read_text()))
            activities_imported += 1

    # --- Demo cohort: the educator owns it; ten students are enrolled with one attempt each ---
    educator = await db.scalar(select(User).where(User.email == "educator@example.com"))
    assert educator is not None
    cohort = await db.scalar(select(Cohort).where(Cohort.join_code == SEED_JOIN_CODE))
    cohort_created = cohort is None
    if cohort is None:
        # Get-or-create by join code, same rationale as the demo users above: a rerun
        # must not create a second "Demo cohort".
        cohort = Cohort(name=SEED_COHORT_NAME, join_code=SEED_JOIN_CODE, created_by=educator.id)
        db.add(cohort)
        await db.flush()
        db.add(Enrollment(user_id=educator.id, cohort_id=cohort.id, role="educator"))

    # The activity's current published snapshot is where the answer keys and knowledge
    # check keys live; grading below reads only from this frozen snapshot, never the
    # working copy, matching how a real submit_attempt is graded.
    lesson = await db.scalar(select(Lesson).where(Lesson.slug == SEED_LESSON_SLUG))
    activity = (
        await db.scalar(select(Activity).where(Activity.lesson_id == lesson.id)) if lesson else None
    )
    assert activity is not None and activity.current_version_id is not None
    version = await db.get(ContentVersion, activity.current_version_id)
    assert version is not None
    checks = knowledge_checks(version.snapshot)

    students_created = attempts_created = 0
    for i in range(1, SEED_STUDENT_COUNT + 1):
        email = f"student{i:02d}@example.com"
        student = await db.scalar(select(User).where(User.email == email))
        if student is None:
            student = User(
                email=email,
                display_name=f"Student {i:02d}",
                role=UserRole.student,
                password_hash=password_hash,
            )
            db.add(student)
            await db.flush()
            students_created += 1
        enrolled = await db.scalar(
            select(Enrollment.id).where(
                Enrollment.user_id == student.id, Enrollment.cohort_id == cohort.id
            )
        )
        if enrolled is None:
            db.add(Enrollment(user_id=student.id, cohort_id=cohort.id, role="student"))
        has_attempt = await db.scalar(
            select(Attempt.id).where(
                Attempt.user_id == student.id, Attempt.activity_id == activity.id
            )
        )
        if has_attempt is not None:
            # Already attempted on a previous seed run; nothing more to do for this student.
            continue
        correct = i % 3  # 1, 2, 0, 1, 2, 0, ... correct answers out of 2
        attempt = Attempt(
            user_id=student.id,
            activity_id=activity.id,
            content_version_id=version.id,
            status="submitted",
            idempotency_key=f"seed-{email}",
        )
        db.add(attempt)
        await db.flush()
        # Sort by key (not hard-coded) so this still works if the lesson gains/loses checks.
        for n, (key, block) in enumerate(sorted(checks.items())):
            answer = int(block["body"]["answer"])
            choice = answer if n < correct else (answer + 1) % len(block["body"]["options"])
            graded = grade_single_choice(block["body"], {"choice": choice})
            db.add(
                AttemptItem(
                    attempt_id=attempt.id,
                    item_key=key,
                    response={"choice": choice},
                    correct=graded.correct,
                    score=graded.score,
                    max_score=graded.max_score,
                    graded_at=datetime.now(UTC),
                )
            )
        max_score = float(len(checks))
        attempt.score = float(correct)
        attempt.max_score = max_score
        attempt.percent = round(100.0 * correct / max_score, 2)
        attempt.passed = attempt.percent >= 80
        attempt.submitted_at = datetime.now(UTC)
        attempt.duration_s = 300 + 30 * i
        await db.flush()
        await upsert_activity_result(db, attempt)  # keep the rollup in step, same as submit_attempt
        attempts_created += 1

    # --- Demo quiz: same ten students, one submitted attempt each on `demo-quiz` ---
    quiz = await db.scalar(select(Quiz).where(Quiz.slug == SEED_QUIZ_SLUG))
    quiz_activity = (
        await db.scalar(select(Activity).where(Activity.kind == "quiz", Activity.ref_id == quiz.id))
        if quiz
        else None
    )
    assert quiz_activity is not None and quiz_activity.current_version_id is not None
    quiz_version = await db.get(ContentVersion, quiz_activity.current_version_id)
    assert quiz_version is not None
    quiz_items = gradeable_items(quiz_version.snapshot)

    quiz_attempts_created = 0
    for i in range(1, SEED_STUDENT_COUNT + 1):
        email = f"student{i:02d}@example.com"
        student = await db.scalar(select(User).where(User.email == email))
        assert student is not None  # created (or already existed) in the loop above
        has_quiz_attempt = await db.scalar(
            select(Attempt.id).where(
                Attempt.user_id == student.id, Attempt.activity_id == quiz_activity.id
            )
        )
        if has_quiz_attempt is not None:
            # Already attempted on a previous seed run; nothing more to do for this student.
            continue
        correct = i % 5  # 1, 2, 3, 4, 0, 1, 2, 3, 4, 0 correct answers out of 4
        attempt = Attempt(
            user_id=student.id,
            activity_id=quiz_activity.id,
            content_version_id=quiz_version.id,
            status="submitted",
            idempotency_key=f"seed-quiz-{email}",
        )
        db.add(attempt)
        await db.flush()
        # Sort by key (not hard-coded) so this still works if the quiz gains/loses questions.
        for n, (key, item) in enumerate(sorted(quiz_items.items())):
            answer = int(item["body"]["answer"])
            choice = answer if n < correct else (answer + 1) % len(item["body"]["options"])
            graded = grade_single_choice(item["body"], {"choice": choice})
            db.add(
                AttemptItem(
                    attempt_id=attempt.id,
                    item_key=key,
                    response={"choice": choice},
                    correct=graded.correct,
                    score=graded.score,
                    max_score=graded.max_score,
                    graded_at=datetime.now(UTC),
                )
            )
        max_score = float(len(quiz_items))
        attempt.score = float(correct)
        attempt.max_score = max_score
        attempt.percent = round(100.0 * correct / max_score, 2)
        attempt.passed = attempt.percent >= 80
        attempt.submitted_at = datetime.now(UTC)
        attempt.duration_s = 300 + 30 * i
        await db.flush()
        await upsert_activity_result(db, attempt)  # keep the rollup in step, same as submit_attempt
        quiz_attempts_created += 1

    return SeedSummary(
        users_created=users_created + students_created,
        lessons_imported=lessons_imported,
        activities_imported=activities_imported,
        students_created=students_created,
        attempts_created=attempts_created,
        quiz_attempts_created=quiz_attempts_created,
        cohort_created=cohort_created,
    )


async def _run() -> None:
    # Standalone script path: builds its own engine/session (this isn't run inside the
    # FastAPI app's lifespan) and commits once, since seed() itself only flushes.
    settings = load_settings()
    engine = get_engine(settings)
    factory = make_session_factory(engine)
    async with factory() as db:
        summary = await seed(db, settings)
        await db.commit()
    print(
        f"seeded: {summary.users_created} users created, "
        f"{summary.lessons_imported} lessons imported, "
        f"{summary.activities_imported} activities imported, "
        f"cohort created: {summary.cohort_created}, "
        f"{summary.students_created} students created, "
        f"{summary.attempts_created} attempts created, "
        f"{summary.quiz_attempts_created} quiz attempts created"
    )
    await engine.dispose()


def main() -> None:
    asyncio.run(_run())


if __name__ == "__main__":
    main()
