import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.ids import new_id

ATTEMPT_STATUSES = ("in_progress", "submitted", "abandoned")
ATTEMPT_SOURCES = ("web", "sdk")


class Attempt(Base):
    __tablename__ = "attempt"
    __table_args__ = (
        CheckConstraint(
            "status IN ('in_progress', 'submitted', 'abandoned')", name="ck_attempt_status"
        ),
        CheckConstraint("source IN ('web', 'sdk')", name="ck_attempt_source"),
        Index("ix_attempt_user_activity", "user_id", "activity_id"),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    activity_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("activity.id", ondelete="CASCADE"), nullable=False
    )
    content_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("content_version.id", ondelete="RESTRICT"), nullable=False
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="in_progress")
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    passed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    duration_s: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source: Mapped[str] = mapped_column(String(10), nullable=False, default="web")
    idempotency_key: Mapped[str | None] = mapped_column(String(128), nullable=True)
    client_meta: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    items: Mapped[list["AttemptItem"]] = relationship(
        back_populates="attempt", cascade="all, delete-orphan", lazy="selectin"
    )


class AttemptItem(Base):
    __tablename__ = "attempt_item"
    __table_args__ = (UniqueConstraint("attempt_id", "item_key", name="uq_attempt_item_key"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    attempt_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("attempt.id", ondelete="CASCADE"), nullable=False
    )
    item_key: Mapped[str] = mapped_column(String(60), nullable=False)
    response: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    graded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    attempt: Mapped[Attempt] = relationship(back_populates="items")
