"""media_asset, data_table, calculator activity kind, and in_progress attempt index.

What this file does: creates the media_asset and data_table tables for plan 3b authoring,
adds the calculator activity kind, and creates a partial unique index ensuring at most one
in_progress attempt per (user, activity) pair (issue #37).

How it fits the project: seventh link in the chain; FKs into `activity`/`user` (0002),
`activity` (0003). Used by Tasks 7-12 implementations.

Depends on: `0006_content_types.py`. Used by: `tests/test_migrations.py` (head "0007"),
Tasks 7-12 implementations.

Revision ID: 0007
Revises: 0006
Create Date: 2026-09-03
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "media_asset",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("storage_key", sa.String(300), nullable=False, unique=True),
        sa.Column("mime", sa.String(100), nullable=False),
        sa.Column("bytes", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=True),
        sa.Column("alt", sa.Text(), nullable=True),
        sa.Column(
            "uploaded_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("confirmed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_table(
        "data_table",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("key", sa.String(80), nullable=False, unique=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("grid", postgresql.JSONB(), nullable=False),
        sa.Column(
            "updated_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    # Widen the activity-kind CHECK for the calculator kind.
    op.drop_constraint("ck_activity_kind", "activity", type_="check")
    op.create_check_constraint(
        "ck_activity_kind",
        "activity",
        "kind IN ('lesson', 'quiz', 'flashcards', 'matching', 'sequencing', 'calculator')",
    )
    # Issue #37: at most one in_progress attempt per (user, activity).
    op.create_index(
        "uq_attempt_one_in_progress",
        "attempt",
        ["user_id", "activity_id"],
        unique=True,
        postgresql_where=sa.text("status = 'in_progress'"),
    )


def downgrade() -> None:
    # Reverse dependency order; restore the original kind vocabulary.
    op.drop_index("uq_attempt_one_in_progress", table_name="attempt")
    op.drop_constraint("ck_activity_kind", "activity", type_="check")
    op.create_check_constraint(
        "ck_activity_kind",
        "activity",
        "kind IN ('lesson', 'quiz', 'flashcards', 'matching', 'sequencing')",
    )
    op.drop_table("data_table")
    op.drop_table("media_asset")
