"""Routes for the educator analytics views: cohort overview, per-student detail,
per-activity stats, and per-outcome mastery.

What this file does: `GET /cohorts/{id}/overview` returns the cohort plus its per-activity
and per-student aggregate tables; `GET /cohorts/{id}/students/{user_id}` returns one
student's per-activity results and submitted-attempt history; `GET
/cohorts/{id}/activities/{activity_id}` returns one activity's stats (FR-E-06); `GET
/cohorts/{id}/outcomes` returns the outcome mastery table (FR-E-07). All four reads are
audited.
Used here and why: `require_cohort_educator` for ownership (same dependency as
`app.cohorts.router`, so the two can never drift on what "educator of this cohort" means);
the query functions in `app.analytics.queries` do the aggregation so this router stays a
thin read-authorize-audit shape.
How it fits the project: FR-E-04/05/06/07/09/10 — the educator half of the M2 vertical
slice plus 3a's activity stats and outcome mastery.
Depends on: `app.analytics.queries`, `app.analytics.schemas`, `app.attempts.models`,
`app.audit.service.record_audit`, `app.auth.deps.require_user`, `app.auth.models.User`,
`app.cohorts.deps.require_cohort_educator`, `app.cohorts.models` (Cohort, Enrollment),
`app.cohorts.router.cohort_out`, `app.cohorts.schemas.MemberOut`, `app.content.models`
(Activity), `app.db.get_session`, `app.errors.Problem`.
Used by: `app.main` (mounted); `tests/test_analytics.py`.
"""

import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.queries import (
    activity_rows,
    activity_stats,
    outcome_rows,
    student_attempts,
    student_results,
    student_rows,
)
from app.analytics.schemas import (
    ActivityStatsOut,
    CohortOverviewOut,
    OutcomeMasteryOut,
    StudentDetailOut,
)
from app.audit.service import record_audit
from app.auth.deps import require_user
from app.auth.models import User
from app.cohorts.deps import require_cohort_educator
from app.cohorts.models import Cohort, Enrollment
from app.cohorts.router import cohort_out
from app.cohorts.schemas import MemberOut
from app.content.models import Activity
from app.db import get_session
from app.errors import Problem

router = APIRouter(prefix="/cohorts", tags=["analytics"])


@router.get("/{cohort_id}/overview", response_model=CohortOverviewOut)
async def cohort_overview(
    request: Request,
    cohort: Cohort = Depends(require_cohort_educator),
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_session),
) -> CohortOverviewOut:
    # Build the three parts of the overview: the cohort itself, then both aggregate tables.
    out = CohortOverviewOut(
        cohort=await cohort_out(db, cohort, "educator"),
        activities=await activity_rows(db, cohort),
        students=await student_rows(db, cohort),
    )
    # Reading the overview is itself audited (FR-E-10).
    await record_audit(
        db,
        actor=user,
        action="read_cohort_overview",
        target_type="cohort",
        target_id=cohort.id,
        cohort_id=cohort.id,
        request=request,
        detail={"students": len(out.students)},
    )
    await db.commit()
    return out


@router.get("/{cohort_id}/students/{user_id}", response_model=StudentDetailOut)
async def student_detail(
    user_id: uuid.UUID,
    request: Request,
    cohort: Cohort = Depends(require_cohort_educator),
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_session),
) -> StudentDetailOut:
    # The target user must be a student enrolled in *this* cohort, not just any user.
    row = (
        await db.execute(
            select(User, Enrollment)
            .join(Enrollment, Enrollment.user_id == User.id)
            .where(
                Enrollment.cohort_id == cohort.id,
                Enrollment.user_id == user_id,
                Enrollment.role == "student",
            )
        )
    ).first()
    if row is None:
        raise Problem(404, "Student not in cohort")
    student, enrollment = row
    attempts = await student_attempts(db, student.id)
    out = StudentDetailOut(
        student=MemberOut(
            user_id=student.id,
            display_name=student.display_name,
            email=student.email,
            role=enrollment.role,
            joined_at=enrollment.joined_at,
            last_activity_at=attempts[0].submitted_at if attempts else None,
        ),
        results=await student_results(db, student.id),
        attempts=attempts,
    )
    # Reading a student's detail view is itself audited (FR-E-10), targeting the student.
    await record_audit(
        db,
        actor=user,
        action="read_student_detail",
        target_type="user",
        target_id=student.id,
        cohort_id=cohort.id,
        request=request,
    )
    await db.commit()
    return out


@router.get("/{cohort_id}/activities/{activity_id}", response_model=ActivityStatsOut)
async def activity_stats_out(
    activity_id: uuid.UUID,
    request: Request,
    cohort: Cohort = Depends(require_cohort_educator),
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_session),
) -> ActivityStatsOut:
    # An unpublished (or nonexistent) activity has never had a snapshot to grade against.
    activity = await db.get(Activity, activity_id)
    if activity is None or activity.status != "published":
        raise Problem(404, "Activity not found")
    out = await activity_stats(db, cohort, activity)
    # Reading one activity's stats is itself audited (FR-E-10), targeting the activity.
    await record_audit(
        db,
        actor=user,
        action="read_activity_stats",
        target_type="activity",
        target_id=activity.id,
        cohort_id=cohort.id,
        request=request,
    )
    await db.commit()
    return out


@router.get("/{cohort_id}/outcomes", response_model=OutcomeMasteryOut)
async def outcome_mastery(
    request: Request,
    cohort: Cohort = Depends(require_cohort_educator),
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_session),
) -> OutcomeMasteryOut:
    out = OutcomeMasteryOut(outcomes=await outcome_rows(db, cohort))
    # Reading the outcome mastery table is itself audited (FR-E-10).
    await record_audit(
        db,
        actor=user,
        action="read_outcomes",
        target_type="cohort",
        target_id=cohort.id,
        cohort_id=cohort.id,
        request=request,
    )
    await db.commit()
    return out
