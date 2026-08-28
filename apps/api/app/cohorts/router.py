"""Routes for cohorts: create/list/get/patch, join-code rotation, student join, roster.

What this file does: educators create cohorts (becoming their educator by enrollment),
rotate the join code, read and prune the roster; students join by code and see the cohorts
they belong to. Reads of student data and every mutation write an audit row.
Used here and why: `require_cohort_educator` for ownership; `cohort_out` builds the one
response shape (hiding the join code from students); join codes are checked for
collision before use (the unique index remains the final guard against a race).
How it fits the project: FR-E-01/02/03/09/10, FR-S-06; `docs/03-architecture.md` §7.
Depends on: `app.cohorts.models`, `app.cohorts.schemas`, `app.cohorts.deps`,
`app.audit.service.record_audit`, `app.auth.deps`, `app.auth.models`,
`app.attempts.models.Attempt` (roster last-activity), `app.db`, `app.errors`.
Used by: `app.main` (mounted); `tests/test_cohorts.py`.
"""

import uuid
from typing import Any, cast

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import CursorResult, delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.attempts.models import Attempt
from app.audit.service import record_audit
from app.auth.deps import require_role, require_user
from app.auth.models import User, UserRole
from app.cohorts.deps import require_cohort_educator
from app.cohorts.models import Cohort, Enrollment, generate_join_code
from app.cohorts.schemas import CohortIn, CohortOut, CohortPatch, JoinIn, MemberOut
from app.db import get_session
from app.errors import Problem

router = APIRouter(prefix="/cohorts", tags=["cohorts"])
JOIN_CODE_RETRIES = 5  # collision-retry budget before giving up on a fresh join code
# Module-level singleton so the route default isn't a nested function call (ruff B008);
# same dependency-factory pattern as require_cohort_educator, just for the global role.
_require_educator_or_admin = require_role(UserRole.educator, UserRole.admin)


async def _student_count(db: AsyncSession, cohort_id: uuid.UUID) -> int:
    # Count of student enrollments only (the educator's own row is excluded).
    n = await db.scalar(
        select(func.count())
        .select_from(Enrollment)
        .where(Enrollment.cohort_id == cohort_id, Enrollment.role == "student")
    )
    return int(n or 0)


async def cohort_out(db: AsyncSession, cohort: Cohort, role: str) -> CohortOut:
    """Serialise a cohort for a caller with the given enrollment role (students get no code)."""
    return CohortOut(
        id=cohort.id,
        name=cohort.name,
        join_code=cohort.join_code if role == "educator" else None,  # hide code from students
        threshold_percent=cohort.threshold_percent,
        starts_on=cohort.starts_on,
        ends_on=cohort.ends_on,
        role=role,
        student_count=await _student_count(db, cohort.id),
    )


async def _commit_with_code(db: AsyncSession, *, flush_only: bool = False) -> None:
    """Flush or commit; a join-code race (unique index) becomes a 409 problem, not a 500."""
    try:
        if flush_only:
            await db.flush()
        else:
            await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise Problem(409, "Join code collided with another cohort; please retry") from exc


async def _assign_fresh_code(db: AsyncSession, cohort: Cohort) -> None:
    """Pick a join code no other cohort uses (the unique index is the final guard)."""
    for _ in range(JOIN_CODE_RETRIES):
        code = generate_join_code()
        # Pre-check for a collision so the common case needs no IntegrityError handling.
        taken = await db.scalar(select(Cohort.id).where(Cohort.join_code == code))
        if taken is None:
            cohort.join_code = code
            return
    raise Problem(500, "Could not allocate a join code")


@router.post("", status_code=status.HTTP_201_CREATED, response_model=CohortOut)
async def create_cohort(
    body: CohortIn,
    request: Request,
    user: User = Depends(_require_educator_or_admin),
    db: AsyncSession = Depends(get_session),
) -> CohortOut:
    # Build the cohort row from the validated request body.
    cohort = Cohort(
        name=body.name,
        join_code=generate_join_code(),
        threshold_percent=body.threshold_percent,
        starts_on=body.starts_on,
        ends_on=body.ends_on,
        created_by=user.id,
    )
    await _assign_fresh_code(db, cohort)
    db.add(cohort)
    await _commit_with_code(db, flush_only=True)  # assign the id; unique index guards the code
    # Creator becomes the cohort's educator by enrollment, not a separate ownership column.
    db.add(Enrollment(user_id=user.id, cohort_id=cohort.id, role="educator"))
    await record_audit(
        db,
        actor=user,
        action="create_cohort",
        target_type="cohort",
        target_id=cohort.id,
        cohort_id=cohort.id,
        request=request,
    )
    await _commit_with_code(db)  # unique index is the final guard against a race
    return await cohort_out(db, cohort, "educator")


@router.get("", response_model=list[CohortOut])
async def list_my_cohorts(
    user: User = Depends(require_user), db: AsyncSession = Depends(get_session)
) -> list[CohortOut]:
    # Every cohort the caller is enrolled in, newest first, with their role in each.
    rows = await db.execute(
        select(Cohort, Enrollment.role)
        .join(Enrollment, Enrollment.cohort_id == Cohort.id)
        .where(Enrollment.user_id == user.id)
        .order_by(Cohort.created_at.desc())
    )
    return [await cohort_out(db, c, role) for c, role in rows.all()]


@router.get("/{cohort_id}", response_model=CohortOut)
async def get_cohort(
    cohort_id: uuid.UUID,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_session),
) -> CohortOut:
    # Unknown cohort 404s before any membership check.
    cohort = await db.get(Cohort, cohort_id)
    if cohort is None:
        raise Problem(404, "Cohort not found")
    # Admins can read any cohort as if they were its educator.
    if user.role == UserRole.admin:
        return await cohort_out(db, cohort, "educator")
    # Otherwise the caller must be enrolled (as either role) to read it.
    role = await db.scalar(
        select(Enrollment.role).where(
            Enrollment.cohort_id == cohort.id, Enrollment.user_id == user.id
        )
    )
    if role is None:
        raise Problem(403, "Not a member of this cohort")
    return await cohort_out(db, cohort, role)


@router.patch("/{cohort_id}", response_model=CohortOut)
async def patch_cohort(
    body: CohortPatch,
    cohort: Cohort = Depends(require_cohort_educator),
    db: AsyncSession = Depends(get_session),
) -> CohortOut:
    # Apply only the fields the caller actually set.
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(cohort, field, value)
    await db.commit()
    return await cohort_out(db, cohort, "educator")


@router.post("/{cohort_id}/rotate-code", response_model=CohortOut)
async def rotate_code(
    request: Request,
    cohort: Cohort = Depends(require_cohort_educator),
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_session),
) -> CohortOut:
    # Assign a fresh unique code, invalidating the old one immediately.
    await _assign_fresh_code(db, cohort)
    await record_audit(
        db,
        actor=user,
        action="rotate_join_code",
        target_type="cohort",
        target_id=cohort.id,
        cohort_id=cohort.id,
        request=request,
    )
    await _commit_with_code(db)  # unique index is the final guard against a race
    return await cohort_out(db, cohort, "educator")


@router.post("/join", response_model=CohortOut)
async def join_cohort(
    body: JoinIn,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_session),
) -> CohortOut:
    # Only students join by code; educators/admins are never enrolled this way.
    if user.role != UserRole.student:
        raise Problem(403, "Only students can join a cohort by code")
    cohort = await db.scalar(select(Cohort).where(Cohort.join_code == body.code))
    if cohort is None:
        raise Problem(404, "Join code not valid")
    existing = await db.scalar(
        select(Enrollment).where(Enrollment.cohort_id == cohort.id, Enrollment.user_id == user.id)
    )
    if existing is None:  # idempotent: a second join is a no-op
        db.add(Enrollment(user_id=user.id, cohort_id=cohort.id, role="student"))
        await db.commit()
    return await cohort_out(db, cohort, "student")


@router.get("/{cohort_id}/members", response_model=list[MemberOut])
async def list_members(
    request: Request,
    cohort: Cohort = Depends(require_cohort_educator),
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_session),
) -> list[MemberOut]:
    # Latest submitted-attempt timestamp per user, joined in below as last_activity_at.
    last_activity = (
        select(Attempt.user_id, func.max(Attempt.submitted_at).label("last_at"))
        .where(Attempt.status == "submitted")
        .group_by(Attempt.user_id)
        .subquery()
    )
    rows = await db.execute(
        select(User, Enrollment, last_activity.c.last_at)
        .join(Enrollment, Enrollment.user_id == User.id)
        .outerjoin(last_activity, last_activity.c.user_id == User.id)
        .where(Enrollment.cohort_id == cohort.id, Enrollment.role == "student")
        .order_by(User.display_name)
    )
    members = [
        MemberOut(
            user_id=u.id,
            display_name=u.display_name,
            email=u.email,
            role=e.role,
            joined_at=e.joined_at,
            last_activity_at=last_at,
        )
        for u, e, last_at in rows.all()
    ]
    # Reading the roster is itself audited (FR-E-10).
    await record_audit(
        db,
        actor=user,
        action="read_cohort_members",
        target_type="cohort",
        target_id=cohort.id,
        cohort_id=cohort.id,
        request=request,
        detail={"count": len(members)},
    )
    await db.commit()
    return members


@router.delete("/{cohort_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    user_id: uuid.UUID,
    request: Request,
    cohort: Cohort = Depends(require_cohort_educator),
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_session),
) -> None:
    # Only removes a student enrollment; an educator can't be removed through this route.
    result = await db.execute(
        delete(Enrollment).where(
            Enrollment.cohort_id == cohort.id,
            Enrollment.user_id == user_id,
            Enrollment.role == "student",
        )
    )
    if (cast(CursorResult[Any], result).rowcount or 0) == 0:
        raise Problem(404, "Member not found")
    await record_audit(
        db,
        actor=user,
        action="remove_member",
        target_type="user",
        target_id=user_id,
        cohort_id=cohort.id,
        request=request,
    )
    await db.commit()
