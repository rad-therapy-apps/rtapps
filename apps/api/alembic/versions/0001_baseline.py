"""baseline

What this file does: the first migration in the chain — enables the Postgres `citext`
extension, which `app.auth.models.User.email` relies on for case-insensitive uniqueness.

How it fits the project: root of the migration chain (`down_revision = None`); every other
migration in `alembic/versions/` descends from this one. See ADR-0001 (Postgres backend).

Depends on: nothing (first revision).
Used by: `0002_auth.py` (`down_revision = "0001"`); `tests/test_migrations.py` (asserts the
chain reaches this via head).

Revision ID: 0001
Revises:
Create Date: 2026-08-27
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS citext")


def downgrade() -> None:
    op.execute("DROP EXTENSION IF EXISTS citext")
