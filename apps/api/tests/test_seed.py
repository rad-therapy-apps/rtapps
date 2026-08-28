"""What this file tests: `app.seed.seed` — the dev/test bring-up routine that
get-or-creates the three demo accounts and imports the seed lessons.

Used here and why: the real Postgres `db`/`client` fixtures from `conftest.py` (not
mocks), because the point of these tests is that `seed()` is safe to call against a
database that may already be seeded, and that the accounts it creates are the ones the
login endpoint actually accepts.

How it fits the project: protects `make seed` (docs/03-architecture.md §10.1) — a
developer or CI job can run seeding more than once without duplicating users or lessons,
and it must never run against a `prod` environment by mistake.

Works with: pytest-asyncio, httpx.
Depends on: `db`, `client`, `settings` fixtures and `TEST_DATABASE_URL` from
`conftest.py`; `app.seed.seed`; `app.config.Settings`.
Used by: CI `api` job in `.github/workflows/pr.yml`; `make test-api`.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.config import Settings
from app.content.models import Lesson
from app.seed import seed
from tests.conftest import TEST_DATABASE_URL


async def test_seed_is_idempotent(db: AsyncSession, settings: Settings) -> None:
    """Calling seed() twice must not double-create anything: the second call sees all
    three demo accounts (and both lessons) already there and creates 0 new users."""
    first = await seed(db, settings)
    second = await seed(db, settings)
    assert first.users_created == 3 and second.users_created == 0
    # Confirms the get-or-create check actually matched existing rows by email, rather
    # than the count happening to come out right for some other reason (e.g. a bug that
    # silently no-ops the whole function on the second call).
    assert (await db.scalar(select(func.count()).select_from(User))) == 3
    lessons = (await db.scalars(select(Lesson))).all()
    assert {lesson.slug for lesson in lessons} == {"rbe-and-oer", "em-spectrum"} and all(
        lesson.status == "published" for lesson in lessons
    )


async def test_seed_users_can_log_in(
    client: AsyncClient, db: AsyncSession, settings: Settings
) -> None:
    """The seeded educator account must be usable through the real login endpoint with
    the documented shared dev password, not just present as a row in the database."""
    await seed(db, settings)
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "educator@example.com", "password": "rtapps-dev-password"},
    )
    assert r.status_code == 200 and r.json()["role"] == "educator"


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
