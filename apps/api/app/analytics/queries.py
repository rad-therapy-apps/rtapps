"""Aggregation queries behind the educator views (`app.analytics.router`).

What this file does: `activity_rows(db, cohort)` and `student_rows(db, cohort)` build the
overview tables from `activity_result` joined through `enrollment` (so only this cohort's
students count); `student_results(db, cohort, user)` and `student_attempts(db, user)` build
the per-student detail.
Used here and why: SQL aggregates (`count`, `avg`) over the rollup rather than in Python so
a 50-student x 100-activity cohort is one query per table (NFR-01); `_mean` rounds to one
decimal in Python so the JSON is stable across Postgres versions.
How it fits the project: FR-E-04/05; every function takes the already-authorised `Cohort`.
Depends on: `app.attempts.models`, `app.attempts.rollup.ActivityResult`, `app.auth.models`,
`app.cohorts.models.Enrollment`, `app.content.models`, `app.analytics.schemas`.
Used by: `app.analytics.router`.
"""

import uuid
from collections import defaultdict
from datetime import datetime
from typing import Any

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.schemas import (
    ActivityRowOut,
    AttemptDetailOut,
    AttemptItemOut,
    StudentResultOut,
    StudentRowOut,
)
from app.attempts.models import Attempt
from app.attempts.rollup import ActivityResult
from app.auth.models import User
from app.cohorts.models import Cohort, Enrollment
from app.content.models import Activity, Lesson, Subject


def _mean(values: list[float]) -> float | None:
    # Rounded to one decimal in Python so the JSON is stable across Postgres versions.
    return round(sum(values) / len(values), 1) if values else None


def _published_activities() -> Select[Any]:
    # Every published activity, all subjects, ordered for display (subject, lesson, title).
    return (
        select(Activity, Lesson.slug)
        .join(Subject, Subject.id == Activity.subject_id)
        .outerjoin(Lesson, Lesson.id == Activity.lesson_id)
        .where(Activity.status == "published")
        .order_by(Subject.order, Lesson.order, Activity.title)
    )


def _cohort_students(cohort_id: uuid.UUID) -> Select[Any]:
    # Every student (not educator) enrolled in this cohort.
    return select(Enrollment.user_id).where(
        Enrollment.cohort_id == cohort_id, Enrollment.role == "student"
    )


async def activity_rows(db: AsyncSession, cohort: Cohort) -> list[ActivityRowOut]:
    """Per-activity overview row: attempted/passed/mean over this cohort's students."""
    # Every published activity, with its lesson slug (None for non-lesson activities).
    activities = (await db.execute(_published_activities())).all()
    # All rollup rows for students in this cohort, across every activity.
    rollups = (
        await db.scalars(
            select(ActivityResult).where(ActivityResult.user_id.in_(_cohort_students(cohort.id)))
        )
    ).all()
    # Group rollups by activity so each activity's row is a simple list comprehension below.
    by_activity: dict[uuid.UUID, list[ActivityResult]] = defaultdict(list)
    for r in rollups:
        by_activity[r.activity_id].append(r)
    rows = []
    for activity, slug in activities:
        rs = by_activity.get(activity.id, [])
        mean = _mean([r.best_percent for r in rs if r.best_percent is not None])
        rows.append(
            ActivityRowOut(
                activity_id=activity.id,
                title=activity.title,
                lesson_slug=slug,
                attempted=len(rs),
                passed=sum(1 for r in rs if r.mastery == "passed"),
                mean_best_percent=mean,
                below_threshold=mean is not None and mean < cohort.threshold_percent,
            )
        )
    return rows


async def student_rows(db: AsyncSession, cohort: Cohort) -> list[StudentRowOut]:
    """Per-student overview row: attempted/passed/mean across every activity."""
    # Every student enrollment in this cohort, ordered by display name.
    members = (
        (
            await db.execute(
                select(User)
                .join(Enrollment, Enrollment.user_id == User.id)
                .where(Enrollment.cohort_id == cohort.id, Enrollment.role == "student")
                .order_by(User.display_name)
            )
        )
        .scalars()
        .all()
    )
    # All rollup rows for students in this cohort, across every activity.
    rollups = (
        await db.scalars(
            select(ActivityResult).where(ActivityResult.user_id.in_(_cohort_students(cohort.id)))
        )
    ).all()
    # Latest submitted-attempt timestamp per user, for last_activity_at.
    last_rows = await db.execute(
        select(Attempt.user_id, func.max(Attempt.submitted_at))
        .where(Attempt.user_id.in_(_cohort_students(cohort.id)), Attempt.status == "submitted")
        .group_by(Attempt.user_id)
    )
    last: dict[uuid.UUID, datetime | None] = {uid: at for uid, at in last_rows.all()}
    # Group rollups by user so each student's row is a simple list comprehension below.
    by_user: dict[uuid.UUID, list[ActivityResult]] = defaultdict(list)
    for r in rollups:
        by_user[r.user_id].append(r)
    rows = []
    for u in members:
        rs = by_user.get(u.id, [])
        mean = _mean([r.best_percent for r in rs if r.best_percent is not None])
        rows.append(
            StudentRowOut(
                user_id=u.id,
                display_name=u.display_name,
                email=u.email,
                attempted=len(rs),
                passed=sum(1 for r in rs if r.mastery == "passed"),
                mean_best_percent=mean,
                below_threshold=mean is not None and mean < cohort.threshold_percent,
                last_activity_at=last.get(u.id),
            )
        )
    return rows


async def student_results(db: AsyncSession, user_id: uuid.UUID) -> list[StudentResultOut]:
    """Per-activity result rows for one student, ordered like the overview's activity table."""
    # Total submitted-attempt duration per activity, for time_spent_s.
    spent_rows = await db.execute(
        select(Attempt.activity_id, func.coalesce(func.sum(Attempt.duration_s), 0))
        .where(Attempt.user_id == user_id, Attempt.status == "submitted")
        .group_by(Attempt.activity_id)
    )
    time_spent: dict[uuid.UUID, int] = {aid: int(total) for aid, total in spent_rows.all()}
    # Only activities the student has a rollup row for (not every published activity).
    rows = await db.execute(
        select(ActivityResult, Activity.title, Lesson.slug)
        .join(Activity, Activity.id == ActivityResult.activity_id)
        .join(Subject, Subject.id == Activity.subject_id)
        .outerjoin(Lesson, Lesson.id == Activity.lesson_id)
        .where(ActivityResult.user_id == user_id)
        .order_by(Subject.order, Lesson.order, Activity.title)
    )
    return [
        StudentResultOut(
            activity_id=r.activity_id,
            title=title,
            lesson_slug=slug,
            best_percent=r.best_percent,
            latest_percent=r.latest_percent,
            attempts=r.attempts,
            first_passed_at=r.first_passed_at,
            mastery=r.mastery,
            time_spent_s=int(time_spent.get(r.activity_id, 0)),
        )
        for r, title, slug in rows.all()
    ]


async def student_attempts(db: AsyncSession, user_id: uuid.UUID) -> list[AttemptDetailOut]:
    """Submitted attempts for one student, newest first, with items sorted by item_key."""
    # Submitted attempts only, newest first, capped at 200 so one student's history is
    # never an unbounded response.
    rows = await db.execute(
        select(Attempt, Activity.title)
        .join(Activity, Activity.id == Attempt.activity_id)
        .where(Attempt.user_id == user_id, Attempt.status == "submitted")
        .order_by(Attempt.submitted_at.desc())
        .limit(200)
    )
    return [
        AttemptDetailOut(
            attempt_id=a.id,
            activity_id=a.activity_id,
            title=title,
            status=a.status,
            started_at=a.started_at,
            submitted_at=a.submitted_at,
            percent=a.percent,
            passed=a.passed,
            duration_s=a.duration_s,
            items=[
                AttemptItemOut(
                    item_key=i.item_key,
                    response=i.response,
                    correct=i.correct,
                    score=i.score,
                    max_score=i.max_score,
                )
                for i in sorted(a.items, key=lambda i: i.item_key)
            ],
        )
        for a, title in rows.all()
    ]
