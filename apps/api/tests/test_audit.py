"""What this file tests: `app.audit.service.record_audit` writes one `audit_log` row with
the actor, action, target, optional cohort, and the request id / client ip taken from the
request.
Used here and why: a Starlette `Request` built from a raw ASGI scope so the header and
client-address extraction is tested without an HTTP round trip.
How it fits the project: FR-E-10 — every educator read of student data is audited; the
routes in plan 2 all call this one helper.
Works with: pytest-asyncio, Starlette.
Depends on: `db` fixture; `app.audit.service`, `app.audit.models`, `app.auth.models`.
Used by: CI `api` job; `make test-api`.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.requests import Request

from app.audit.models import AuditLog
from app.audit.service import client_ip, record_audit
from app.auth.models import User, UserRole


def _request(
    headers: dict[str, str], client: tuple[str, int] | None = ("10.0.0.7", 1234)
) -> Request:
    raw = [(k.lower().encode(), v.encode()) for k, v in headers.items()]
    return Request({"type": "http", "method": "GET", "path": "/", "headers": raw, "client": client})


def test_client_ip_prefers_forwarded_header() -> None:
    """Behind Caddy the real address is the first X-Forwarded-For entry."""
    assert client_ip(_request({"x-forwarded-for": "203.0.113.9, 10.0.0.1"})) == "203.0.113.9"
    assert client_ip(_request({})) == "10.0.0.7"
    assert client_ip(_request({}, client=None)) is None
    assert client_ip(None) is None


async def test_record_audit_writes_row(db: AsyncSession) -> None:
    """One row per call carrying actor/action/target/cohort/request id/ip/detail."""
    actor = User(email="a@example.edu", display_name="A", role=UserRole.educator)
    db.add(actor)
    await db.flush()
    target = uuid.uuid4()
    cohort = uuid.uuid4()
    row = await record_audit(
        db,
        actor=actor,
        action="read_student_detail",
        target_type="user",
        target_id=target,
        cohort_id=cohort,
        request=_request({"x-request-id": "req-123"}),
        detail={"n": 1},
    )
    await db.flush()
    stored = await db.scalar(select(AuditLog).where(AuditLog.id == row.id))
    assert stored is not None
    assert stored.actor_id == actor.id and stored.action == "read_student_detail"
    assert stored.target_type == "user" and stored.target_id == target
    assert stored.cohort_id == cohort and stored.request_id == "req-123"
    assert stored.ip == "10.0.0.7" and stored.detail == {"n": 1} and stored.at is not None


async def test_record_audit_without_request(db: AsyncSession) -> None:
    """Callers outside HTTP (seed, scripts) can audit with no request: ip/request_id are null."""
    actor = User(email="b@example.edu", display_name="B", role=UserRole.admin)
    db.add(actor)
    await db.flush()
    row = await record_audit(
        db, actor=actor, action="change_role", target_type="user", target_id=actor.id
    )
    await db.flush()
    assert row.ip is None and row.request_id is None and row.detail == {}
