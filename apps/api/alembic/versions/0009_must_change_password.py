"""must_change_password: force-password-change flag on user.

What this file does: adds `must_change_password` (boolean, not null, default false) to
`user`. Set True by the admin temp-password reset endpoint, cleared by change-password.

How it fits the project: ninth link in the chain; backs Task 3's admin reset-password
endpoint and the `require_user` gate that blocks everything but `/api/v1/auth/*` until
the flag is cleared.

Depends on: `0008_external_kind.py`. Used by: `tests/test_migrations.py` (head "0009"),
`app.auth.models.User.must_change_password`.

Revision ID: 0009
Revises: 0008
Create Date: 2026-09-11
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0009"
down_revision: str | None = "0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "user",
        sa.Column("must_change_password", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("user", "must_change_password")
