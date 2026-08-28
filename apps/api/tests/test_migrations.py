"""What this file tests: that the test database (migrated by the `migrated_db` fixture in
`conftest.py`) actually lands on the expected alembic head revision.

Used here and why: a raw SQL read of alembic's own bookkeeping table — this is a check on
the migration chain itself, not on any app code, so it needs no app-level fixtures.

How it fits the project: a tripwire against forgetting to bump this test after adding a
migration; if `head` moved but this assertion didn't, `migrated_db`'s
downgrade-base/upgrade-head would have quietly run to a different schema than the one this
test file expects.

Works with: pytest-asyncio, sqlalchemy asyncio.
Depends on: `db` (and transitively `migrated_db`) fixtures from `conftest.py`;
`alembic/versions/`.
Used by: CI `api` job in `.github/workflows/pr.yml`; `make test-api`.
"""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def test_schema_is_at_head(db: AsyncSession) -> None:
    """The migrated test database's alembic_version matches the latest known revision id."""
    version = await db.scalar(text("SELECT version_num FROM alembic_version"))
    assert version == "0005"  # bump when a migration is added
