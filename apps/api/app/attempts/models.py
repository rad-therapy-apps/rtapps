"""SQLAlchemy ORM models for `attempt` and `attempt_item` — the one result schema every

app in the project writes to (ADR-0004).

What this file does: `Attempt` is one student's run at one activity, pinned to the
`content_version` it was graded against; `AttemptItem` is one per-question response inside
that attempt (currently one per knowledge_check).

Used here and why: SQLAlchemy 2.0 `Mapped`/`mapped_column` declarative models, same style
as `app.content.models`. CHECK constraints on `status`/`source` instead of Postgres enums
so adding a value (e.g. a new `source`) is a plain migration. `client_meta` JSONB is a
deliberately loose, size-capped bag for source-specific extras (see ADR-0004) that
analytics never queries into.

How it fits the project: an attempt is graded against the exact `content_version` snapshot
pinned at `start()` (`app.attempts.router.start_attempt`), so an author editing or
republishing the lesson afterwards can never change a historical score. `activity_result`
rollups (Phase 2, not yet in this codebase) will be derived from these rows.

Works with:
  Depends on: `app.db.Base` (declarative base), `app.ids.new_id` (UUIDv7 primary keys).
  Used by: `app.attempts.router` (Attempt, AttemptItem); `tests/test_attempts.py`;
    `alembic/env.py` (imported for autogenerate metadata).
"""

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

# Closed value sets for the CHECK constraints below (see the matching tuple pattern in
# app.content.models); adding a value here plus a migration is the whole cost of extension.
ATTEMPT_STATUSES = ("in_progress", "submitted", "abandoned")
ATTEMPT_SOURCES = ("web", "sdk")


# One student's run at one activity. `content_version_id` (not just `activity_id`) is the
# pin that makes re-grading and historical scores exact even after the author republishes.
class Attempt(Base):
    __tablename__ = "attempt"
    __table_args__ = (
        CheckConstraint(
            "status IN ('in_progress', 'submitted', 'abandoned')", name="ck_attempt_status"
        ),
        CheckConstraint("source IN ('web', 'sdk')", name="ck_attempt_source"),
        # Speeds up "this user's attempts at this activity" (start_attempt / my_results-style
        # lookups); not unique — a user can have multiple attempts (retries) at one activity.
        Index("ix_attempt_user_activity", "user_id", "activity_id"),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    activity_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("activity.id", ondelete="CASCADE"), nullable=False
    )
    # ondelete="RESTRICT": a content_version can't be deleted while any attempt still
    # references it — attempts are the historical record; nothing should ever be able to
    # delete the snapshot out from under a graded result.
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
    # Set from the `Idempotency-Key` header on submit; compared on a retried submit so the
    # same key returns the original result instead of re-grading (see submit_attempt).
    idempotency_key: Mapped[str | None] = mapped_column(String(128), nullable=True)
    client_meta: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    # selectin: batches all items for an attempt into one extra query — submit_attempt and
    # grade_item both need the full item list, not just one at a time.
    items: Mapped[list["AttemptItem"]] = relationship(
        back_populates="attempt", cascade="all, delete-orphan", lazy="selectin"
    )


# One graded response within an attempt, keyed by the knowledge_check's stable `key` (see
# app.content.models.ContentBlock and app.content.snapshot.knowledge_checks).
class AttemptItem(Base):
    __tablename__ = "attempt_item"
    # unique(attempt_id, item_key): at most one row per question per attempt; grade_item
    # relies on this by updating the existing row instead of inserting a duplicate on
    # autosave/re-answer.
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
