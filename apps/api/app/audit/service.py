"""The one helper every audited route calls: `record_audit`.

What this file does: builds an `AuditLog` row from the acting user, an action name, the
target, and (optionally) the request — pulling the request id and client ip from headers.
Used here and why: a single function so the audit row shape is identical everywhere and
tests can assert on it; `X-Forwarded-For` is honoured because the API always sits behind
Caddy (ADR-0002/0005) and would otherwise log the proxy's address.
How it fits the project: FR-E-10 (educator reads audited) and FR-M-01 (role changes
audited). Callers add the row to the *same* session as the read/mutation, so the audit
entry commits with it.
Works with:
  Depends on: `app.audit.models.AuditLog`, `app.auth.models.User`, Starlette `Request`.
  Used by: `app.cohorts.router`, `app.analytics.router`, `app.admin.router`,
    `tests/test_audit.py`.
"""

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from starlette.requests import Request

from app.audit.models import AuditLog
from app.auth.models import User


def client_ip(request: Request | None) -> str | None:
    """First X-Forwarded-For hop (set by the proxy), else the socket peer, else None."""
    if request is None:
        return None
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()[:45]
    return request.client.host if request.client else None


async def record_audit(
    db: AsyncSession,
    *,
    actor: User,
    action: str,
    target_type: str,
    target_id: uuid.UUID | None,
    cohort_id: uuid.UUID | None = None,
    request: Request | None = None,
    detail: dict[str, Any] | None = None,
) -> AuditLog:
    """Add (not commit) one audit row; the caller's transaction decides when it lands."""
    row = AuditLog(
        actor_id=actor.id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        cohort_id=cohort_id,
        request_id=(request.headers.get("x-request-id") if request else None),
        ip=client_ip(request),
        detail=detail or {},
    )
    db.add(row)
    return row
