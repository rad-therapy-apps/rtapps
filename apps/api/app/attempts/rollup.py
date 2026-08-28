"""The `activity_result` rollup: one row per (user, activity) summarising their attempts.

What this file does: defines `ActivityResult` (best/latest percent, attempt count, first
pass, mastery) and — from Task 3 — `upsert_activity_result`, which `submit_attempt` calls
inside its transaction so the row is never out of step with `attempt`.
Used here and why: a denormalised row so cohort views read one row per student-activity
instead of aggregating every attempt on each page load (FR-X-02; docs/03-architecture.md
§6.2 "the row analytics read most"). `mastery` is text with a CHECK constraint.
How it fits the project: ADR-0004 — attempts are the spine, rollups are the read model.
Works with:
  Depends on: `app.db.Base`, `app.ids.new_id`, `app.attempts.models.Attempt`.
  Used by: `app.attempts.router.submit_attempt`, `app.analytics.queries`, `app.seed`,
    `alembic/env.py`, `tests/test_rollup.py`.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.ids import new_id

MASTERY_LEVELS = ("none", "attempted", "passed")


# One row per (user, activity): the denormalised summary analytics reads instead of
# aggregating every `attempt` row on each page load.
class ActivityResult(Base):
    __tablename__ = "activity_result"
    __table_args__ = (
        UniqueConstraint("user_id", "activity_id", name="uq_activity_result_user_activity"),
        CheckConstraint(
            "mastery IN ('none', 'attempted', 'passed')", name="ck_activity_result_mastery"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    activity_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("activity.id", ondelete="CASCADE"), nullable=False, index=True
    )
    best_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    latest_attempt_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("attempt.id", ondelete="SET NULL"), nullable=True
    )
    latest_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    first_passed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    mastery: Mapped[str] = mapped_column(String(20), nullable=False, default="none")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
