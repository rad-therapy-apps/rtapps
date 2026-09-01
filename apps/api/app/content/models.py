"""SQLAlchemy ORM models for curriculum content: the editable working copy plus the
immutable published snapshot.

What this file does: defines the tables an author edits (`subject`, `lesson`,
`lesson_page`, `question`, `content_block`, `activity`) and the append-only
`content_version` table that a publish writes to. Working-copy rows can change freely;
a `content_version` row, once written, never changes.

Used here and why: SQLAlchemy 2.0 `Mapped`/`mapped_column` declarative models, matching
the rest of the app. JSONB columns (`Question.stem/body/explanation`, `ContentBlock.body`,
`Activity.config`, `ContentVersion.snapshot`) hold ProseMirror rich-text documents and
free-form config so the shape can evolve without a migration for every field. CHECK
constraints (via `_in`) stand in for Postgres enums on `status`/`type`/`kind` columns so
adding a new value is a plain data migration instead of an `ALTER TYPE`. `lazy="selectin"`
on `Lesson.pages`, `LessonPage.blocks` and `ContentBlock.question` batches the child loads
into one extra query each instead of N+1 round trips when a lesson tree is read.

How it fits the project: authors edit these tables through the (future) authoring UI;
`app.content.service.publish_lesson` resolves the tree via `app.content.snapshot.build_snapshot`
into one `content_version.snapshot` JSONB document and repoints `current_version_id`.
Students only ever read snapshots (`app.content.router`), never these working-copy rows.
See ADR-0003 in `docs/adr/`.

Works with:
  Depends on: `app.auth.models.TimestampMixin` (created_at/updated_at columns), `app.db.Base`
    (declarative base), `app.ids.new_id` (UUIDv7 primary keys).
  Used by: `app.content.snapshot` (reads the tree), `app.content.service` (publish),
    `app.content.importer` (writes working copies), `app.content.router` (reads
    `ContentVersion`/`Lesson`/`Subject`), `app.attempts.router` (reads `Activity`/
    `ContentVersion`/`Lesson`), `alembic/env.py` (imported for autogenerate metadata),
    and the content/importer/model test modules.
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.auth.models import TimestampMixin
from app.db import Base
from app.ids import new_id

# Closed value sets for the CHECK-constraint columns below. Adding a value here plus a
# migration is the whole cost of extending one of these "enums" (no ALTER TYPE needed).
LESSON_STATUSES = ("draft", "published", "archived")
BLOCK_TYPES = ("rich_text", "knowledge_check")
QUESTION_TYPES = ("single_choice",)
ACTIVITY_KINDS = ("lesson", "quiz", "flashcards", "matching", "sequencing")
ACTIVITY_ACCESS = ("practice", "assessment")


def _in(column: str, values: tuple[str, ...], name: str) -> CheckConstraint:
    """Build a `column IN (...)` CHECK constraint from one of the tuples above."""
    quoted = ", ".join(f"'{v}'" for v in values)
    return CheckConstraint(f"{column} IN ({quoted})", name=name)


# A subject groups lessons for browsing (e.g. "Radiation Biology"); no publish/version
# concept of its own — it is metadata around the lessons it contains.
class Subject(TimestampMixin, Base):
    __tablename__ = "subject"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    lessons: Mapped[list["Lesson"]] = relationship(
        back_populates="subject", order_by="Lesson.order"
    )


# The lesson working copy: what the author is currently editing. `status`/`current_version_id`
# track the *last publish*, not the live edit state, so an author can keep editing a
# published lesson without affecting what students see until the next publish.
class Lesson(TimestampMixin, Base):
    __tablename__ = "lesson"
    __table_args__ = (_in("status", LESSON_STATUSES, "ck_lesson_status"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    subject_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("subject.id", ondelete="CASCADE"), nullable=False
    )
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    current_version_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey(
            "content_version.id",
            ondelete="SET NULL",
            # use_alter=True: `lesson` is created before `content_version` in 0003_content.py
            # (content_version.activity_id in turn FKs to `activity`, created before it too),
            # so this FK can't exist at CREATE TABLE time. It's added as a deferred ALTER
            # TABLE after content_version exists (see create_foreign_key calls at the end of
            # that migration's upgrade()).
            use_alter=True,
            name="fk_lesson_current_version",
        ),
        nullable=True,
    )
    subject: Mapped[Subject] = relationship(back_populates="lessons")
    # selectin: loads all pages for a lesson in one extra query (not per-lesson N+1) whenever
    # a Lesson is fetched — the snapshot builder always needs the full page tree.
    pages: Mapped[list["LessonPage"]] = relationship(
        back_populates="lesson",
        order_by="LessonPage.order",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


# One page within a lesson (the workbook's original pagination). `order` plus the unique
# constraint below fix the page sequence at the database level.
class LessonPage(TimestampMixin, Base):
    __tablename__ = "lesson_page"
    # Two pages in the same lesson can't share a position; this is what "reorder pages"
    # ultimately has to respect.
    __table_args__ = (UniqueConstraint("lesson_id", "order", name="uq_lesson_page_order"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("lesson.id", ondelete="CASCADE"), nullable=False
    )
    order: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    lesson: Mapped[Lesson] = relationship(back_populates="pages")
    # selectin: same reasoning as Lesson.pages — the snapshot builder walks every block on
    # every page, so batch-loading them avoids a query per page.
    blocks: Mapped[list["ContentBlock"]] = relationship(
        back_populates="page",
        order_by="ContentBlock.order",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


# A question bank row, referenced by a knowledge_check content block. `stem` is the
# question text as ProseMirror JSON; `body` holds the type-specific payload (for
# `single_choice`: {"options": [...], "answer": int}) including the answer key, which is
# why questions are never returned to students directly — only via a stripped snapshot.
class Question(TimestampMixin, Base):
    __tablename__ = "question"
    __table_args__ = (_in("type", QUESTION_TYPES, "ck_question_type"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    stem: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    body: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    explanation: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)


# One content item on a page: either `rich_text` (ProseMirror `body`) or `knowledge_check`
# (`body = {"key": "..."}`, the actual question lives in the linked Question row). `key` is
# the stable identifier a student's attempt items reference (see
# `app.content.snapshot.knowledge_checks` and `app.attempts.router.grade_item`), so it must
# stay the same across republishes even if the question wording changes.
class ContentBlock(TimestampMixin, Base):
    __tablename__ = "content_block"
    __table_args__ = (
        UniqueConstraint("page_id", "order", name="uq_content_block_order"),
        _in("type", BLOCK_TYPES, "ck_content_block_type"),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    page_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("lesson_page.id", ondelete="CASCADE"), nullable=False
    )
    order: Mapped[int] = mapped_column(Integer, nullable=False)
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    body: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    # ondelete="RESTRICT": a question can't be deleted while a block still references it;
    # the importer's reimport path deletes the block first, then the orphaned question
    # (see app/content/importer.py), rather than relying on a cascade here.
    question_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("question.id", ondelete="RESTRICT"), nullable=True
    )
    page: Mapped[LessonPage] = relationship(back_populates="blocks")
    question: Mapped[Question | None] = relationship(lazy="selectin")


# The gradeable/attemptable unit that `attempt` rows point at. `kind` is the only
# supported value today ("lesson"); `ref_id` + `lesson_id` both point at the same Lesson
# for now, but `ref_id` is generic so a future activity kind (quiz, matching, ...) can
# reuse this table without a schema change — only `lesson_id` is lesson-specific.
class Activity(TimestampMixin, Base):
    __tablename__ = "activity"
    __table_args__ = (
        _in("kind", ACTIVITY_KINDS, "ck_activity_kind"),
        _in("status", LESSON_STATUSES, "ck_activity_status"),
        _in("access", ACTIVITY_ACCESS, "ck_activity_access"),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    kind: Mapped[str] = mapped_column(String(30), nullable=False)
    ref_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    subject_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("subject.id", ondelete="CASCADE"), nullable=False
    )
    # unique=True: one lesson has at most one activity (today's 1:1 lesson<->activity
    # pairing); nullable because non-lesson activity kinds would have no lesson at all.
    lesson_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("lesson.id", ondelete="CASCADE"), nullable=True, unique=True
    )
    config: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    # ADR-0006: 'practice' activities are student-visible; 'assessment' pools are reserved
    # for educator-assigned quizzing (games phase) and are 404 to students everywhere.
    access: Mapped[str] = mapped_column(String(20), nullable=False, default="practice")
    current_version_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey(
            "content_version.id",
            ondelete="SET NULL",
            # use_alter=True for the same reason as Lesson.current_version_id above:
            # `activity` is created before `content_version` in 0003_content.py.
            use_alter=True,
            name="fk_activity_current_version",
        ),
        nullable=True,
    )
    subject: Mapped[Subject] = relationship()
    lesson: Mapped[Lesson | None] = relationship()


# The immutable publish record. No TimestampMixin/updated_at on purpose: a row is written
# once by `app.content.service.publish_lesson` and never updated afterwards — that
# immutability is what lets an `attempt` pin `content_version_id` and stay valid forever,
# even after the author edits the working copy again.
class ContentVersion(Base):
    __tablename__ = "content_version"
    __table_args__ = (
        # unique(activity_id, version): version numbers are per-activity and sequential
        # (see `publish_lesson`'s max(version)+1), so this both prevents duplicates and
        # gives a natural ordering for "which publish was this".
        UniqueConstraint("activity_id", "version", name="uq_content_version_activity_version"),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    activity_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("activity.id", ondelete="CASCADE"), nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    # The full resolved content tree (activity/lesson/pages/blocks, answers included) as
    # one JSONB document — see app.content.snapshot.build_snapshot for how it's assembled
    # and app.content.snapshot.strip_answers for what's removed before it reaches a student.
    snapshot: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    author_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="SET NULL"), nullable=True
    )
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    change_note: Mapped[str | None] = mapped_column(Text, nullable=True)
