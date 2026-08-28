"""Routes for the admin API: user search/list, role change, deactivation, audit-log view.

What this file does: `GET /users` lists/searches users with cursor pagination; `PATCH
/users/{id}/role` changes a user's role (audited); `POST /users/{id}/deactivate` soft-disables
a user and revokes their sessions (audited); `GET /audit-log` lists audit rows with filters.
Every route requires `UserRole.admin`.
Used here and why: `require_role(UserRole.admin)` as a router-level dependency (same
"apply to the whole router" pattern as `app.content.router`); `_target` centralises the
404/400 checks shared by role-change and deactivate; UUIDv7 ids sort by creation time, so
`User.id.desc()` plus `User.id < cursor` gives newest-first cursor pagination for free.
How it fits the project: FR-M-01/02/04 — the admin surface the owner uses to promote/demote
and deactivate accounts, and to read the audit trail those actions (and others) leave.
Depends on: `app.admin.schemas`, `app.audit.models.AuditLog`, `app.audit.service.record_audit`,
`app.auth.deps` (require_role, require_user), `app.auth.models` (User, UserRole),
`app.auth.sessions.revoke_all_for_user`, `app.db.get_session`, `app.errors.Problem`.
Used by: `app.main` (mounted); `tests/test_admin.py`.
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.schemas import AdminUserOut, AuditOut, RoleIn, UserPage
from app.audit.models import AuditLog
from app.audit.service import record_audit
from app.auth.deps import require_role, require_user
from app.auth.models import User, UserRole
from app.auth.sessions import revoke_all_for_user
from app.db import get_session
from app.errors import Problem

# Module-level singleton so the router's `dependencies=[Depends(...)]` default isn't a
# nested function call (ruff B008); same pattern as `app.cohorts.router._require_educator_or_admin`.
_require_admin = require_role(UserRole.admin)
router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(_require_admin)])


@router.get("/users", response_model=UserPage)
async def list_users(
    q: str | None = Query(default=None, max_length=120),
    limit: int = Query(default=50, ge=1, le=200),
    cursor: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_session),
) -> UserPage:
    # Fetch one extra row so we can tell whether a next page exists without a count query.
    stmt = select(User).order_by(User.id.desc()).limit(limit + 1)  # UUIDv7 = creation order
    if q:
        # Case-insensitive substring match on either email or display name.
        pattern = f"%{q.strip()}%"
        stmt = stmt.where(or_(User.email.ilike(pattern), User.display_name.ilike(pattern)))
    if cursor:
        stmt = stmt.where(User.id < cursor)  # UUIDv7 ids are time-ordered
    users = (await db.scalars(stmt)).all()
    items = [AdminUserOut.model_validate(u) for u in users[:limit]]
    next_cursor = str(items[-1].id) if len(users) > limit else None
    return UserPage(items=items, next_cursor=next_cursor)


async def _target(db: AsyncSession, user_id: uuid.UUID, actor: User) -> User:
    # Shared 404 (unknown user) / 400 (acting on your own account) guard for the two
    # mutating routes below.
    target = await db.get(User, user_id)
    if target is None:
        raise Problem(404, "User not found")
    if target.id == actor.id:
        raise Problem(400, "You cannot change your own account here")
    return target


@router.patch("/users/{user_id}/role", response_model=AdminUserOut)
async def change_role(
    user_id: uuid.UUID,
    body: RoleIn,
    request: Request,
    actor: User = Depends(require_user),
    db: AsyncSession = Depends(get_session),
) -> User:
    target = await _target(db, user_id, actor)
    previous = target.role
    target.role = body.role
    # Audited in the same transaction as the mutation, so the row and the audit entry
    # commit (or roll back) together.
    await record_audit(
        db,
        actor=actor,
        action="change_role",
        target_type="user",
        target_id=target.id,
        request=request,
        detail={"from": previous.value, "to": body.role.value},
    )
    await db.commit()
    return target


@router.post("/users/{user_id}/deactivate", response_model=AdminUserOut)
async def deactivate_user(
    user_id: uuid.UUID,
    request: Request,
    actor: User = Depends(require_user),
    db: AsyncSession = Depends(get_session),
) -> User:
    target = await _target(db, user_id, actor)
    # Already deactivated: nothing changes, so no sessions to revoke and no audit row (a
    # second "deactivate_user" entry would misrepresent the log).
    if target.deactivated_at is not None:
        return target
    target.deactivated_at = datetime.now(UTC)
    # `resolve_session` already refuses a deactivated user's sessions, so this revoke is
    # belt-and-braces, not the only thing enforcing it.
    revoked = await revoke_all_for_user(db, target.id)
    await record_audit(
        db,
        actor=actor,
        action="deactivate_user",
        target_type="user",
        target_id=target.id,
        request=request,
        detail={"sessions_revoked": revoked},
    )
    await db.commit()
    return target


@router.get("/audit-log", response_model=list[AuditOut])
async def audit_log(
    actor_id: uuid.UUID | None = None,
    action: str | None = Query(default=None, max_length=60),
    target_id: uuid.UUID | None = None,
    since: datetime | None = None,
    until: datetime | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    db: AsyncSession = Depends(get_session),
) -> list[AuditOut]:
    # Outer join to the actor's current email; an actor whose account was later deleted
    # (actor_id set null, see AuditLog.actor_id's ON DELETE) still shows up with email=None.
    stmt = (
        select(AuditLog, User.email)
        .outerjoin(User, User.id == AuditLog.actor_id)
        .order_by(AuditLog.at.desc(), AuditLog.id.desc())
        .limit(limit)
    )
    if actor_id:
        stmt = stmt.where(AuditLog.actor_id == actor_id)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if target_id:
        stmt = stmt.where(AuditLog.target_id == target_id)
    if since:
        stmt = stmt.where(AuditLog.at >= since)
    if until:
        stmt = stmt.where(AuditLog.at <= until)
    return [
        AuditOut(
            id=row.id,
            actor_id=row.actor_id,
            actor_email=email,
            action=row.action,
            target_type=row.target_type,
            target_id=row.target_id,
            cohort_id=row.cohort_id,
            request_id=row.request_id,
            ip=row.ip,
            at=row.at,
            detail=row.detail,
        )
        for row, email in (await db.execute(stmt)).all()
    ]
