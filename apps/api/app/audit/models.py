"""SQLAlchemy ORM model for `audit_log` — who did what to whom, and from where.

What this file does: an append-only row per audited action (FR-E-10, FR-M-01): actor,
action name, target (type + id), optional cohort context, the request id the web app
stamped on the request, the client ip, and a free-form JSONB `detail`.
Used here and why: no `updated_at` and no ORM relationships on purpose — rows are never
edited, and reads (admin audit-log view) join by id explicitly.
How it fits the project: written only through `app.audit.service.record_audit`; read by
`app.admin.router` (`GET /admin/audit-log`). Retention ≥ 2 years (NFR-26) is a policy
note in docs/06-operations.md, not enforced in code yet.
Works with:
  Depends on: `app.db.Base`, `app.ids.new_id`.
  Used by: `app.audit.service`, `app.admin.router`, `alembic/env.py`, tests.
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.ids import new_id


# One append-only row per audited action: actor, action, target, optional cohort context,
# and the request id / client ip pulled from the HTTP request (if any).
class AuditLog(Base):
    __tablename__ = "audit_log"
    __table_args__ = (Index("ix_audit_log_at", "at"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="SET NULL"), nullable=True, index=True
    )
    action: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    target_type: Mapped[str] = mapped_column(String(30), nullable=False)
    target_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )
    cohort_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )
    request_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)  # IPv6 max length
    at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    detail: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
