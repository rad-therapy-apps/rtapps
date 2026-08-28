"""cohorts, results, audit: cohort, enrollment, activity_result, audit_log

What this file does: creates the four plan-2 tables.
How it fits the project: fifth link in the chain; FKs into `user` (0002), `activity` (0003)
and `attempt` (0004).
Depends on: `0004_attempts.py`. Used by: `tests/test_migrations.py` (head "0005").

Revision ID: 0005
Revises: 0004
Create Date: 2026-08-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # cohort: a named group of students with a rotatable join code and a below-threshold
    # percentage for the educator overview.
    op.create_table(
        "cohort",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("join_code", sa.String(12), nullable=False, unique=True),
        sa.Column("threshold_percent", sa.Integer(), nullable=False, server_default="70"),
        sa.Column("starts_on", sa.Date(), nullable=True),
        sa.Column("ends_on", sa.Date(), nullable=True),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "threshold_percent >= 0 AND threshold_percent <= 100", name="ck_cohort_threshold"
        ),
    )
    # enrollment: links a user to a cohort with a role; unique(user, cohort) is what the
    # educator-owns-a-cohort-via-enrollment design relies on.
    op.create_table(
        "enrollment",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "cohort_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("cohort.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role", sa.String(20), nullable=False, server_default="student"),
        sa.Column(
            "joined_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("user_id", "cohort_id", name="uq_enrollment_user_cohort"),
        sa.CheckConstraint("role IN ('student', 'educator')", name="ck_enrollment_role"),
    )
    op.create_index("ix_enrollment_user_id", "enrollment", ["user_id"])
    op.create_index("ix_enrollment_cohort_id", "enrollment", ["cohort_id"])
    # activity_result: one denormalised rollup row per (user, activity) — see
    # app.attempts.rollup / ADR-0004.
    op.create_table(
        "activity_result",
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
        sa.Column("best_percent", sa.Float(), nullable=True),
        sa.Column(
            "latest_attempt_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("attempt.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("latest_percent", sa.Float(), nullable=True),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("first_passed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("mastery", sa.String(20), nullable=False, server_default="none"),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("user_id", "activity_id", name="uq_activity_result_user_activity"),
        sa.CheckConstraint(
            "mastery IN ('none', 'attempted', 'passed')", name="ck_activity_result_mastery"
        ),
    )
    op.create_index("ix_activity_result_activity_id", "activity_result", ["activity_id"])
    # audit_log: append-only row per audited action — see app.audit.service.record_audit.
    op.create_table(
        "audit_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "actor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("action", sa.String(60), nullable=False),
        sa.Column("target_type", sa.String(30), nullable=False),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("cohort_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("request_id", sa.String(64), nullable=True),
        sa.Column("ip", sa.String(45), nullable=True),
        sa.Column("at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "detail", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"
        ),
    )
    for col in ("actor_id", "action", "target_id", "cohort_id", "at"):
        op.create_index(f"ix_audit_log_{col}", "audit_log", [col])


def downgrade() -> None:
    # Reverse dependency order.
    op.drop_table("audit_log")
    op.drop_table("activity_result")
    op.drop_table("enrollment")
    op.drop_table("cohort")
