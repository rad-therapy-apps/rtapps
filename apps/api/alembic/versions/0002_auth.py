"""auth: user, identity, session

What this file does: creates the `user_role` Postgres enum and the `user`, `identity` and
`session` tables — the schema behind `app.auth.models` and ADR-0002's session design.

How it fits the project: second link in the migration chain, descends from `0001_baseline`
(needs `citext` for `user.email`); `0003_content.py` adds a foreign key from
`content_version.author_id` to this migration's `user` table.

Depends on: `0001_baseline.py` (`down_revision = "0001"`; needs the `citext` extension).
Used by: `0003_content.py` (`down_revision = "0002"`; FKs to `user`); `tests/test_migrations.py`.

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# create_type=False: the enum TYPE is created explicitly below (op.execute); this object is
# only used to describe the "role" column's type when creating the "user" table.
user_role = postgresql.ENUM("student", "educator", "admin", name="user_role", create_type=False)


def upgrade() -> None:
    op.execute("CREATE TYPE user_role AS ENUM ('student', 'educator', 'admin')")
    # user, identity, session: same three tables and columns as app.auth.models, expressed
    # as raw op.create_table calls (Alembic migrations don't reuse the ORM model classes).
    op.create_table(
        "user",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", postgresql.CITEXT(), nullable=False),
        sa.Column("display_name", sa.String(120), nullable=False),
        sa.Column("role", user_role, nullable=False, server_default="student"),
        sa.Column("password_hash", sa.Text(), nullable=True),
        sa.Column("deactivated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("email", name="uq_user_email"),
    )
    # identity: one row per linked external-provider account (currently just Google);
    # unique(provider, subject) is what makes the OAuth callback's lookup a lookup.
    op.create_table(
        "identity",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("provider", sa.String(32), nullable=False),
        sa.Column("subject", sa.String(255), nullable=False),
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("provider", "subject", name="uq_identity_provider_subject"),
    )
    op.create_index("ix_identity_user_id", "identity", ["user_id"])
    # session: id is the sha256 hex of the raw token (never the token itself, per ADR-0002);
    # expires_at/revoked_at are what resolve_session checks on every request.
    op.create_table(
        "session",
        sa.Column("id", sa.String(64), primary_key=True),  # sha256 hex of the token
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ua_hash", sa.String(64), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_session_user_id", "session", ["user_id"])
    op.create_index("ix_session_expires_at", "session", ["expires_at"])


def downgrade() -> None:
    # Reverse dependency order: session/identity FK to user, so they must drop first.
    op.drop_table("session")
    op.drop_table("identity")
    op.drop_table("user")
    op.execute("DROP TYPE user_role")
