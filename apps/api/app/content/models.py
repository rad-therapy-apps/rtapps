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
    event,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.auth.models import TimestampMixin
from app.db import Base
from app.ids import new_id

LESSON_STATUSES = ("draft", "published", "archived")
BLOCK_TYPES = ("rich_text", "knowledge_check")
QUESTION_TYPES = ("single_choice",)
ACTIVITY_KINDS = ("lesson",)


def _in(column: str, values: tuple[str, ...], name: str) -> CheckConstraint:
    quoted = ", ".join(f"'{v}'" for v in values)
    return CheckConstraint(f"{column} IN ({quoted})", name=name)


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
            use_alter=True,
            name="fk_lesson_current_version",
        ),
        nullable=True,
    )
    subject: Mapped[Subject] = relationship(back_populates="lessons")
    pages: Mapped[list["LessonPage"]] = relationship(
        back_populates="lesson",
        order_by="LessonPage.order",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class LessonPage(TimestampMixin, Base):
    __tablename__ = "lesson_page"
    __table_args__ = (UniqueConstraint("lesson_id", "order", name="uq_lesson_page_order"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("lesson.id", ondelete="CASCADE"), nullable=False
    )
    order: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    lesson: Mapped[Lesson] = relationship(back_populates="pages")
    blocks: Mapped[list["ContentBlock"]] = relationship(
        back_populates="page",
        order_by="ContentBlock.order",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class Question(TimestampMixin, Base):
    __tablename__ = "question"
    __table_args__ = (_in("type", QUESTION_TYPES, "ck_question_type"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    stem: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    body: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    explanation: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)


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
    question_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("question.id", ondelete="RESTRICT"), nullable=True
    )
    page: Mapped[LessonPage] = relationship(back_populates="blocks")
    question: Mapped[Question | None] = relationship(lazy="selectin")


class Activity(TimestampMixin, Base):
    __tablename__ = "activity"
    __table_args__ = (
        _in("kind", ACTIVITY_KINDS, "ck_activity_kind"),
        _in("status", LESSON_STATUSES, "ck_activity_status"),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    kind: Mapped[str] = mapped_column(String(30), nullable=False)
    ref_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    subject_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("subject.id", ondelete="CASCADE"), nullable=False
    )
    lesson_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("lesson.id", ondelete="CASCADE"), nullable=True, unique=True
    )
    config: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    current_version_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey(
            "content_version.id",
            ondelete="SET NULL",
            use_alter=True,
            name="fk_activity_current_version",
        ),
        nullable=True,
    )
    subject: Mapped[Subject] = relationship()
    lesson: Mapped[Lesson | None] = relationship()


class ContentVersion(Base):
    __tablename__ = "content_version"
    __table_args__ = (
        UniqueConstraint("activity_id", "version", name="uq_content_version_activity_version"),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    activity_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("activity.id", ondelete="CASCADE"), nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    snapshot: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    author_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="SET NULL"), nullable=True
    )
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    change_note: Mapped[str | None] = mapped_column(Text, nullable=True)


def _eager_id(target: Any, args: tuple[Any, ...], kwargs: dict[str, Any]) -> None:
    """Populate `id` at construction time (not flush time).

    `default=new_id` on the `id` column is a flush-time default, so callers that
    reference `instance.id` before the row is flushed (e.g. to set an FK on a sibling
    object) would otherwise see `None`. Generating it eagerly on `__init__` avoids that.
    """
    kwargs.setdefault("id", new_id())


for _model in (Subject, Lesson, LessonPage, Question, ContentBlock, Activity, ContentVersion):
    event.listen(_model, "init", _eager_id)
