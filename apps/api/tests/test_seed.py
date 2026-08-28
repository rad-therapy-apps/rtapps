"""What this file tests: `app.seed.seed` — the dev/test bring-up routine that
get-or-creates the three demo accounts and imports the seed lessons, plus the demo
cohort/students/attempts/rollups it now also seeds.

Used here and why: the real Postgres `db`/`client` fixtures from `conftest.py` (not
mocks), because the point of these tests is that `seed()` is safe to call against a
database that may already be seeded, and that the accounts it creates are the ones the
login endpoint actually accepts.

How it fits the project: protects `make seed` (docs/03-architecture.md §10.1) — a
developer or CI job can run seeding more than once without duplicating users, lessons,
the demo cohort, its student enrolments or their attempts/rollups, and it must never run
against a `prod` environment by mistake.

Works with: pytest-asyncio, httpx.
Depends on: `db`, `client`, `settings` fixtures and `TEST_DATABASE_URL` from
`conftest.py`; `app.seed.seed`; `app.config.Settings`; `app.cohorts.models` (Cohort,
Enrollment); `app.attempts.models` (Attempt); `app.attempts.rollup` (ActivityResult).
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
from app.content.models import Lesson
from app.seed import seed
from tests.conftest import TEST_DATABASE_URL


async def test_seed_is_idempotent(db: AsyncSession, settings: Settings) -> None:
    """Calling seed() twice must not double-create anything: the second call sees all
    thirteen accounts (three demo plus ten students, and both lessons) already there and
    creates 0 new users."""
    first = await seed(db, settings)
    second = await seed(db, settings)
    assert first.users_created == 13 and second.users_created == 0
    # Confirms the get-or-create check actually matched existing rows by email, rather
    # than the count happening to come out right for some other reason (e.g. a bug that
    # silently no-ops the whole function on the second call).
    assert (await db.scalar(select(func.count()).select_from(User))) == 13
    lessons = (await db.scalars(select(Lesson))).all()
    assert {lesson.slug for lesson in lessons} == {"rbe-and-oer", "em-spectrum"} and all(
        lesson.status == "published" for lesson in lessons
    )


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
    attempt on rbe-and-oer scoring index % 3 out of 2, and a rollup row; re-seeding adds none."""
    first = await seed(db, settings)
    assert first.cohort_created and first.students_created == 10 and first.attempts_created == 10
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
    percents = sorted((await db.scalars(select(ActivityResult.best_percent))).all())
    assert percents == [0.0, 0.0, 0.0, 50.0, 50.0, 50.0, 50.0, 100.0, 100.0, 100.0]
    second = await seed(db, settings)
    assert (
        not second.cohort_created and second.students_created == 0 and second.attempts_created == 0
    )
    assert (await db.scalar(select(func.count()).select_from(Attempt))) == 10


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
