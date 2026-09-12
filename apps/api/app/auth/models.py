"""SQLAlchemy ORM models for `user`, `identity` (OAuth linkage) and `session`.

What this file does: defines the three tables ADR-0002's auth design is built on — the
account itself (`User`), one row per external-provider identity linked to an account
(`Identity`, e.g. Google), and one row per active login (`Session`). Also defines
`UserRole` (the closed set of roles routes authorize against) and `TimestampMixin`
(shared created_at/updated_at columns).

Used here and why: SQLAlchemy 2.0 `Mapped`/`mapped_column` declarative models, matching
the rest of the app. `CITEXT` on `User.email` gives case-insensitive uniqueness/lookup at
the database level instead of normalizing case in Python. A Postgres `Enum` backs
`User.role` (a small, rarely-changing set, unlike the CHECK-constraint "enums" in
`app.content.models`).

How it fits the project: this is the data half of ADR-0002 (same-origin proxy, server-side
cookie sessions); `app.auth.sessions` reads/writes `Session` rows keyed by a hash of the
opaque token, `app.auth.deps` resolves the `rt_session` cookie back to a `User` through it,
and `app.auth.router` is what creates/updates all three tables.

Works with:
  Depends on: `app.db.Base` (declarative base), `app.ids.new_id` (UUIDv7 primary keys).
  Used by: `app.auth.deps`, `app.auth.sessions`, `app.auth.router`, `app.auth.schemas`,
    `app.content.importer`, `app.content.service`, `app.content.models`
    (`TimestampMixin`), `app.attempts.router`, `app.seed`, `alembic/env.py` (autogenerate
    metadata), and the auth/roles/session test modules.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    false,
    func,
)
from sqlalchemy.dialects.postgresql import CITEXT, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.ids import new_id


# Closed set of roles; `app.auth.deps.require_role` checks membership in this against
# `User.role`. Cohort-specific ownership is a separate, per-query check, not a role.
class UserRole(str, enum.Enum):  # noqa: UP042 -- str-Enum member values (not StrEnum) per brief interface
    student = "student"
    educator = "educator"
    admin = "admin"


# Shared created_at/updated_at columns, mixed into every table below (and into
# app.content.models' tables) so timestamp handling is identical everywhere.
class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


# One account. `identities`/`sessions` cascade-delete with the user; password_hash is
# nullable because an OAuth-only account (Google, no password set) has none.
class User(TimestampMixin, Base):
    __tablename__ = "user"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(CITEXT, unique=True, nullable=False)  # case-insensitive
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=UserRole.student,
    )
    password_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Soft-disable flag: set (not None) blocks both password login (app.auth.router.login)
    # and session resolution (app.auth.sessions.resolve_session), without deleting the row.
    deactivated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Set True by the admin temp-password reset; forces the user through change-password
    # before anything else (app.auth.deps.require_user), then cleared by change_password.
    must_change_password: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=false()
    )

    identities: Mapped[list["Identity"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    sessions: Mapped[list["Session"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


# One linked external-provider identity (currently just Google) per user; the unique
# constraint is what makes google_callback's provider+subject lookup an identity lookup.
class Identity(TimestampMixin, Base):
    __tablename__ = "identity"
    __table_args__ = (UniqueConstraint("provider", "subject", name="uq_identity_provider_subject"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)  # provider's stable user id
    email_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    user: Mapped[User] = relationship(back_populates="identities")


# One active (or recently revoked/expired) login. Per ADR-0002, the raw session token
# never touches the database — only its hash does — so a DB read/leak can't yield a
# usable session; `app.auth.sessions` is the only module that hashes/compares tokens.
class Session(TimestampMixin, Base):
    __tablename__ = "session"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # sha256 hex of the token
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    ua_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)  # hashed User-Agent
    # Set (not None) on logout / revoke-all; a revoked session still exists (audit trail)
    # but resolve_session treats it as gone.
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship(back_populates="sessions")
