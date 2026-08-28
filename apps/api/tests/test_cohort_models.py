"""What this file tests: the `cohort`/`enrollment` rows from `app.cohorts.models` and the
`activity_result` row from `app.attempts.rollup` — constraints (unique join code, unique
(user, cohort), unique (user, activity)) and the join-code generator's alphabet.
Used here and why: the real Postgres `db` fixture, because uniqueness is enforced by the
database, not by Python.
How it fits the project: the schema half of plan 2 (cohorts, ADR-0004 rollups).
Works with: pytest-asyncio, SQLAlchemy.
Depends on: `db` fixture (`conftest.py`), `seed_lesson`; `app.cohorts.models`,
`app.attempts.rollup`, `app.auth.models`.
Used by: CI `api` job; `make test-api`.
"""

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.attempts.rollup import ActivityResult
from app.auth.models import User, UserRole
from app.cohorts.models import JOIN_CODE_ALPHABET, Cohort, Enrollment, generate_join_code
from app.content.models import Activity
from tests.conftest import seed_lesson


def test_generate_join_code_shape() -> None:
    """Six characters, all from the unambiguous alphabet, and not constant."""
    codes = {generate_join_code() for _ in range(50)}
    assert all(len(c) == 6 and set(c) <= set(JOIN_CODE_ALPHABET) for c in codes)
    assert len(codes) > 1
    assert not set("0O1I") & set(JOIN_CODE_ALPHABET)


async def test_enrollment_unique_per_user_cohort(db: AsyncSession) -> None:
    """A user can be enrolled in a cohort only once; the DB refuses a duplicate."""
    edu = User(email="e@example.edu", display_name="E", role=UserRole.educator)
    db.add(edu)
    await db.flush()
    cohort = Cohort(name="C", join_code="ABCDEF", created_by=edu.id)
    db.add(cohort)
    await db.flush()
    assert cohort.threshold_percent == 70
    db.add(Enrollment(user_id=edu.id, cohort_id=cohort.id, role="educator"))
    await db.flush()
    db.add(Enrollment(user_id=edu.id, cohort_id=cohort.id, role="student"))
    with pytest.raises(IntegrityError):
        await db.flush()


async def test_join_code_unique(db: AsyncSession) -> None:
    """Two cohorts cannot share a join code."""
    edu = User(email="e2@example.edu", display_name="E", role=UserRole.educator)
    db.add(edu)
    await db.flush()
    db.add(Cohort(name="A", join_code="SAME22", created_by=edu.id))
    await db.flush()
    db.add(Cohort(name="B", join_code="SAME22", created_by=edu.id))
    with pytest.raises(IntegrityError):
        await db.flush()


async def test_activity_result_unique_per_user_activity(db: AsyncSession) -> None:
    """One rollup row per (user, activity)."""
    lesson = await seed_lesson(db)
    activity = await db.scalar(select(Activity).where(Activity.lesson_id == lesson.id))
    assert activity is not None
    user = User(email="s@example.edu", display_name="S", role=UserRole.student)
    db.add(user)
    await db.flush()
    db.add(
        ActivityResult(user_id=user.id, activity_id=activity.id, attempts=1, mastery="attempted")
    )
    await db.flush()
    db.add(
        ActivityResult(user_id=user.id, activity_id=activity.id, attempts=1, mastery="attempted")
    )
    with pytest.raises(IntegrityError):
        await db.flush()
