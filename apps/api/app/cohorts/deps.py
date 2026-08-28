"""`require_cohort_educator` — the one authorization dependency for educator cohort routes.

What this file does: loads the cohort by id (404 if missing) and checks, in SQL, that the
caller is enrolled in it with role `educator` — or is an admin (403 otherwise).
Used here and why: a FastAPI dependency taking the `cohort_id` path parameter, so every
educator route declares `cohort: Cohort = Depends(require_cohort_educator)` and gets both
the row and the authorization in one line (docs/03-architecture.md §8: "cohort ownership is
enforced inside the query, never by trusting client-supplied ids").
How it fits the project: FR-E-09 / NFR-11. Used by cohorts and analytics routers alike so
the two can never drift in what "educator of this cohort" means.
Depends on: `app.cohorts.models`, `app.auth.deps.require_user`, `app.auth.models`,
`app.db.get_session`, `app.errors.Problem`.
Used by: `app.cohorts.router`, `app.analytics.router`, `tests/test_cohorts.py`.
"""

import uuid

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import require_user
from app.auth.models import User, UserRole
from app.cohorts.models import Cohort, Enrollment
from app.db import get_session
from app.errors import Problem


async def require_cohort_educator(
    cohort_id: uuid.UUID,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_session),
) -> Cohort:
    # Unknown cohort 404s before any authorization check.
    cohort = await db.get(Cohort, cohort_id)
    if cohort is None:
        raise Problem(404, "Cohort not found")
    # Admins pass for any existing cohort.
    if user.role == UserRole.admin:
        return cohort
    # Otherwise the caller must be enrolled in this specific cohort as educator.
    enrolled = await db.scalar(
        select(Enrollment.id).where(
            Enrollment.cohort_id == cohort.id,
            Enrollment.user_id == user.id,
            Enrollment.role == "educator",
        )
    )
    if enrolled is None:
        raise Problem(403, "Not an educator of this cohort")
    return cohort
