"""content: subject, lesson, lesson_page, question, content_block, activity, content_version

What this file does: creates the whole curriculum content schema (ADR-0003) — the six
working-copy tables plus the append-only `content_version` snapshot table — then adds the
two `current_version_id` foreign keys (`lesson`, `activity`) that had to wait until
`content_version` existed.

How it fits the project: third link in the migration chain; `lesson`/`activity` reference
`content_version`, and `content_version.author_id` references `0002_auth.py`'s `user`
table, which is why this table order and the deferred FK step below are needed.

Depends on: `0002_auth.py` (`down_revision = "0002"`; FKs to its `user` table).
Used by: `0004_attempts.py` (`down_revision = "0003"`; FKs to `activity`/`content_version`);
`tests/test_migrations.py`.

Revision ID: 0003
Revises: 0002
Create Date: 2026-08-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # subject: metadata-only grouping of lessons; no publish/version concept of its own.
    op.create_table(
        "subject",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(80), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("slug"),
    )
    # lesson: the author's working copy; status/current_version_id track the *last publish*,
    # not the live edit state (an author can edit a published lesson without republishing).
    # current_version_id has no FK yet here — content_version doesn't exist until below;
    # see the deferred op.create_foreign_key calls at the end of this function.
    op.create_table(
        "lesson",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "subject_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("subject.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("slug", sa.String(120), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("current_version_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("slug"),
        sa.CheckConstraint("status IN ('draft', 'published', 'archived')", name="ck_lesson_status"),
    )
    # lesson_page: ordered pages within a lesson; unique(lesson_id, order) keeps page order
    # unambiguous.
    op.create_table(
        "lesson_page",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "lesson_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("lesson.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("lesson_id", "order", name="uq_lesson_page_order"),
    )
    # question: stem/body/explanation are JSONB (ProseMirror docs / free-form question
    # config, ADR-0003) so their shape can evolve without a migration for every field;
    # `type` is CHECK-constrained rather than a Postgres enum for the same reason.
    op.create_table(
        "question",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("type", sa.String(30), nullable=False),
        sa.Column("stem", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("body", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("explanation", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint("type IN ('single_choice')", name="ck_question_type"),
    )
    # content_block: one block of page content, in order; question_id is set only for
    # knowledge_check blocks (ondelete="RESTRICT" so a question in use can't be deleted).
    op.create_table(
        "content_block",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "page_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("lesson_page.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(30), nullable=False),
        sa.Column("body", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "question_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("question.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("page_id", "order", name="uq_content_block_order"),
        sa.CheckConstraint(
            "type IN ('rich_text', 'knowledge_check')", name="ck_content_block_type"
        ),
    )
    # activity: the attemptable unit (currently only kind='lesson', ref_id -> lesson.id);
    # current_version_id, like lesson's, gets its FK added below once content_version exists.
    op.create_table(
        "activity",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("kind", sa.String(30), nullable=False),
        sa.Column("ref_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column(
            "subject_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("subject.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "lesson_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("lesson.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("config", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("current_version_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("lesson_id"),
        sa.CheckConstraint("kind IN ('lesson')", name="ck_activity_kind"),
        sa.CheckConstraint(
            "status IN ('draft', 'published', 'archived')", name="ck_activity_status"
        ),
    )
    # content_version: the append-only publish snapshot. unique(activity_id, version) makes
    # each publish a new numbered row rather than overwriting the last one; snapshot is the
    # full resolved JSONB tree a student's attempt is graded against (never mutated after
    # insert).
    op.create_table(
        "content_version",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "activity_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("activity.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "author_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("change_note", sa.Text(), nullable=True),
        sa.UniqueConstraint("activity_id", "version", name="uq_content_version_activity_version"),
    )
    op.create_index("ix_content_version_activity_id", "content_version", ["activity_id"])

    # Deferred FKs: lesson/activity.current_version_id can only reference content_version
    # once that table exists, so these are added here rather than inline on create_table
    # above (an equivalent of a use_alter'd ORM foreign key). ondelete="SET NULL" so
    # deleting a content_version un-points the lesson/activity rather than failing/cascading.
    op.create_foreign_key(
        "fk_lesson_current_version",
        "lesson",
        "content_version",
        ["current_version_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_activity_current_version",
        "activity",
        "content_version",
        ["current_version_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    # Reverse dependency order: drop the deferred FKs first, then tables child-to-parent.
    op.drop_constraint("fk_activity_current_version", "activity", type_="foreignkey")
    op.drop_constraint("fk_lesson_current_version", "lesson", type_="foreignkey")
    op.drop_table("content_version")
    op.drop_table("activity")
    op.drop_table("content_block")
    op.drop_table("question")
    op.drop_table("lesson_page")
    op.drop_table("lesson")
    op.drop_table("subject")
