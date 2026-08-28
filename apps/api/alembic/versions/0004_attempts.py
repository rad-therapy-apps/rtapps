"""attempts: attempt, attempt_item

What this file does: creates the `attempt` and `attempt_item` tables — the one result
schema every app in the project writes to (ADR-0004).

How it fits the project: fourth and (so far) last link in the migration chain; `attempt`
FKs to `0002_auth.py`'s `user` table and `0003_content.py`'s `activity`/`content_version`
tables, which is why this migration must come after both.

Depends on: `0003_content.py` (`down_revision = "0003"`; FKs to `activity`/`content_version`);
transitively `0002_auth.py`'s `user` table.
Used by: `tests/test_migrations.py` (this is the current head, "0004").

Revision ID: 0004
Revises: 0003
Create Date: 2026-08-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # attempt: one student's run at one activity, pinned to the content_version it was
    # graded against (ondelete="RESTRICT" on content_version_id — that snapshot can never
    # be deleted while an attempt still references it).
    op.create_table(
        "attempt",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "activity_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("activity.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "content_version_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("content_version.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("max_score", sa.Float(), nullable=True),
        sa.Column("percent", sa.Float(), nullable=True),
        sa.Column("passed", sa.Boolean(), nullable=True),
        sa.Column("duration_s", sa.Integer(), nullable=True),
        sa.Column("source", sa.String(10), nullable=False),
        sa.Column("idempotency_key", sa.String(128), nullable=True),
        sa.Column("client_meta", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.CheckConstraint(
            "status IN ('in_progress', 'submitted', 'abandoned')", name="ck_attempt_status"
        ),
        sa.CheckConstraint("source IN ('web', 'sdk')", name="ck_attempt_source"),
    )
    # Speeds up "this user's attempts at this activity" lookups; not unique — a user can
    # have multiple attempts (retries) at one activity.
    op.create_index("ix_attempt_user_activity", "attempt", ["user_id", "activity_id"])
    # attempt_item: one graded response per question per attempt; unique(attempt_id,
    # item_key) is what lets grade_item upsert instead of inserting a duplicate on
    # autosave/re-answer.
    op.create_table(
        "attempt_item",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "attempt_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("attempt.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("item_key", sa.String(60), nullable=False),
        sa.Column("response", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("correct", sa.Boolean(), nullable=True),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("max_score", sa.Float(), nullable=True),
        sa.Column("time_ms", sa.Integer(), nullable=True),
        sa.Column("graded_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("attempt_id", "item_key", name="uq_attempt_item_key"),
    )


def downgrade() -> None:
    # Reverse dependency order: attempt_item FKs to attempt, so it must drop first.
    op.drop_table("attempt_item")
    op.drop_index("ix_attempt_user_activity", table_name="attempt")
    op.drop_table("attempt")
