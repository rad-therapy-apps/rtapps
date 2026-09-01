"""SQLAlchemy ORM models for `cohort` and `enrollment`, plus the join-code generator.

What this file does: a `Cohort` is a named group of students with a rotatable join code
and a below-threshold percentage for the overview; an `Enrollment` links a user to a
cohort with a role — an educator "owns" a cohort by being enrolled in it with role
`educator` (docs/03-architecture.md §6.2).
Used here and why: SQLAlchemy 2.0 declarative models matching the rest of the app; a
CHECK constraint on `enrollment.role` (text, not a Postgres enum) like the content tables;
`secrets.choice` for the join code so codes are unpredictable; an unambiguous alphabet
(no 0/O/1/I) because codes are read aloud in classrooms.
How it fits the project: plan 2 (FR-E-01/02/03, FR-S-06). `app.cohorts.router` creates
and joins cohorts; `app.cohorts.deps.require_cohort_educator` reads `Enrollment` to
authorise; `app.analytics` joins through `Enrollment` to scope every read to one cohort.
Works with:
  Depends on: `app.auth.models.TimestampMixin`, `app.db.Base`, `app.ids.new_id`.
  Used by: `app.cohorts.router`, `app.cohorts.deps`, `app.analytics.queries`,
    `app.seed`, `alembic/env.py`, `tests/test_cohort_models.py`, `Program`
    (in Tasks 1-10 for tying cohorts to academic programs).
"""

import secrets
import uuid
from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.auth.models import TimestampMixin, User
from app.db import Base
from app.ids import new_id

# Unambiguous characters only — no 0/O or 1/I — because codes are read out loud.
JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
JOIN_CODE_LENGTH = 6
ENROLLMENT_ROLES = ("student", "educator")


def generate_join_code() -> str:
    """Six random characters from the unambiguous alphabet (uniqueness is enforced by the DB)."""
    return "".join(secrets.choice(JOIN_CODE_ALPHABET) for _ in range(JOIN_CODE_LENGTH))


# A named group of students with a rotatable join code; `threshold_percent` is the
# below-threshold cutoff the educator overview flags students against.
class Cohort(TimestampMixin, Base):
    __tablename__ = "cohort"
    __table_args__ = (
        CheckConstraint(
            "threshold_percent >= 0 AND threshold_percent <= 100", name="ck_cohort_threshold"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    join_code: Mapped[str] = mapped_column(String(12), unique=True, nullable=False)
    threshold_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=70)
    starts_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    ends_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="SET NULL"), nullable=True
    )
    program_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("program.id", ondelete="SET NULL"), nullable=True
    )

    enrollments: Mapped[list["Enrollment"]] = relationship(
        back_populates="cohort", cascade="all, delete-orphan"
    )


# Links a user to a cohort with a role; an educator "owns" a cohort by being enrolled in
# it with role "educator" rather than through a separate ownership column.
class Enrollment(Base):
    __tablename__ = "enrollment"
    __table_args__ = (
        UniqueConstraint("user_id", "cohort_id", name="uq_enrollment_user_cohort"),
        CheckConstraint("role IN ('student', 'educator')", name="ck_enrollment_role"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True
    )
    cohort_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("cohort.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="student")
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    cohort: Mapped[Cohort] = relationship(back_populates="enrollments")
    user: Mapped[User] = relationship()


# Single institution today; the nullable FK is the multi-program growth point (docs/03 §5).
class Program(TimestampMixin, Base):
    __tablename__ = "program"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
