"""Aggregation queries behind the educator views (`app.analytics.router`).

What this file does: `activity_rows(db, cohort)` and `student_rows(db, cohort)` build the
overview tables from `activity_result` joined through `enrollment` (so only this cohort's
students count); `student_results(db, cohort, user)` and `student_attempts(db, user)` build
the per-student detail; `activity_stats(db, cohort, activity)` builds one activity's stats
(FR-E-06) and `outcome_rows(db, cohort)` builds the outcome mastery table (FR-E-07).
Used here and why: SQL aggregates (`count`, `avg`) over the rollup rather than in Python so
a 50-student x 100-activity cohort is one query per table (NFR-01); `_mean` rounds to one
decimal in Python so the JSON is stable across Postgres versions. `activity_stats` and
`outcome_rows` instead pull the (cohort-scoped, activity- or nothing-scoped) `Attempt` rows
in one query each — `Attempt.items` is `lazy="selectin"` so that's still one extra query,
not N+1 — and aggregate in Python, the same split `activity_rows` already uses between "one
query" and "the snapshot-dependent part" (labels, option text) that only Python can do.
How it fits the project: FR-E-04/05/06/07; every function takes the already-authorised
`Cohort`.
Depends on: `app.attempts.models`, `app.attempts.rollup.ActivityResult`, `app.auth.models`,
`app.cohorts.models.Enrollment`, `app.content.activity_models` (Outcome, QuestionOutcome),
`app.content.activity_snapshots` (gradeable_items, item_labels), `app.content.models`,
`app.analytics.schemas`.
Used by: `app.analytics.router`.
"""

import uuid
from collections import Counter, defaultdict
from datetime import datetime
from typing import Any

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.schemas import (
    ActivityRowOut,
    ActivityStatsOut,
    AttemptDetailOut,
    AttemptItemOut,
    AttemptRowOut,
    BucketOut,
    ItemStatOut,
    OutcomeRowOut,
    OutcomeStudentOut,
    StudentResultOut,
    StudentRowOut,
    WrongOut,
)
from app.attempts.models import Attempt
from app.attempts.rollup import ActivityResult
from app.auth.models import User
from app.cohorts.models import Cohort, Enrollment
from app.content.activity_models import Outcome, QuestionOutcome
from app.content.activity_snapshots import gradeable_items, item_labels
from app.content.models import Activity, ContentVersion, Lesson, Subject

# Score distribution buckets for activity_stats, in display order; bounds are inclusive.
_DISTRIBUTION_BUCKETS = [
    (0, 49, "0-49"),
    (50, 69, "50-69"),
    (70, 79, "70-79"),
    (80, 89, "80-89"),
    (90, 100, "90-100"),
]


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


async def activity_stats(db: AsyncSession, cohort: Cohort, activity: Activity) -> ActivityStatsOut:
    """One activity's stats (FR-E-06): attempts/pass rate/distribution over this cohort's
    submitted attempts, plus per-item correctness resolved against the current snapshot."""
    # Every submitted attempt on this activity by this cohort's students, items included
    # (selectin) in the same query.
    attempts = (
        await db.scalars(
            select(Attempt).where(
                Attempt.activity_id == activity.id,
                Attempt.status == "submitted",
                Attempt.user_id.in_(_cohort_students(cohort.id)),
            )
        )
    ).all()
    # Flashcards leave percent/passed null; excluded from both the pass rate and buckets.
    passed = [a.passed for a in attempts if a.passed is not None]
    pass_rate = round(100 * sum(passed) / len(passed), 1) if passed else None
    percents = [a.percent for a in attempts if a.percent is not None]
    distribution = [
        BucketOut(label=label, count=sum(1 for p in percents if lo <= p <= hi))
        for lo, hi, label in _DISTRIBUTION_BUCKETS
    ]
    # Current snapshot for labels/options; a key an attempt has that the current snapshot
    # doesn't (an older republished version) keeps the raw key as its label, no options.
    version = await db.get(ContentVersion, activity.current_version_id)
    assert version is not None
    labels = item_labels(version.snapshot)
    defs = gradeable_items(version.snapshot)
    # Group every graded response by item key: answered/correct counts, and incorrect
    # `response["choice"]` tallies for top_wrong (both need the whole attempt list, so this
    # is the Python half of the split described in the module docstring).
    answered: dict[str, int] = defaultdict(int)
    correct: dict[str, int] = defaultdict(int)
    wrong_choices: dict[str, Counter[int]] = defaultdict(Counter)
    for a in attempts:
        for item in a.items:
            answered[item.item_key] += 1
            if item.correct:
                correct[item.item_key] += 1
            elif isinstance(item.response, dict) and isinstance(item.response.get("choice"), int):
                wrong_choices[item.item_key][item.response["choice"]] += 1
    items = []
    for key in sorted(answered):
        options = defs.get(key, {}).get("body", {}).get("options", [])
        n, c = answered[key], correct[key]
        top_wrong = [
            WrongOut(option=options[choice], count=count)
            for choice, count in wrong_choices[key].most_common()
            if 0 <= choice < len(options)
        ][:2]
        items.append(
            ItemStatOut(
                key=key,
                label=labels.get(key, key),
                answered=n,
                correct=c,
                percent_correct=round(100 * c / n, 1) if n else None,
                top_wrong=top_wrong,
            )
        )
    # `external` (games, plan 4b #53) activities have no per-item stats, so educators get
    # the raw per-attempt scores instead; other kinds already have `items` above.
    attempt_rows = []
    if activity.kind == "external":
        rows = await db.execute(
            select(Attempt, User.display_name)
            .join(User, User.id == Attempt.user_id)
            .where(
                Attempt.activity_id == activity.id,
                Attempt.status == "submitted",
                Attempt.user_id.in_(_cohort_students(cohort.id)),
            )
            .order_by(Attempt.submitted_at.desc())
        )
        attempt_rows = [
            AttemptRowOut(
                display_name=display_name,
                score=a.score,
                max_score=a.max_score,
                percent=a.percent,
                submitted_at=a.submitted_at,
            )
            for a, display_name in rows.all()
        ]
    return ActivityStatsOut(
        activity_id=activity.id,
        title=activity.title,
        kind=activity.kind,
        attempts=len(attempts),
        students_attempted=len({a.user_id for a in attempts}),
        pass_rate=pass_rate,
        distribution=distribution,
        items=items,
        attempt_rows=attempt_rows,
    )


async def outcome_rows(db: AsyncSession, cohort: Cohort) -> list[OutcomeRowOut]:
    """Per-outcome mastery table (FR-E-07): aggregate and per-student correctness over
    quiz items tagged with that outcome, for this cohort's students.

    Quiz attempt item keys are `str(question_id)`, so a question's outcome tags apply to
    any attempt item whose key matches — non-quiz items simply never match (the documented
    limitation: only quiz questions carry outcome tags today).
    """
    outcomes = (await db.scalars(select(Outcome).order_by(Outcome.code))).all()
    tags = (await db.execute(select(QuestionOutcome.outcome_id, QuestionOutcome.question_id))).all()
    questions_by_outcome: dict[uuid.UUID, set[uuid.UUID]] = defaultdict(set)
    outcomes_by_item_key: dict[str, list[uuid.UUID]] = defaultdict(list)
    for outcome_id, question_id in tags:
        questions_by_outcome[outcome_id].add(question_id)
        outcomes_by_item_key[str(question_id)].append(outcome_id)
    # Cohort students, ordered like the overview's student table (for the per-outcome rows'
    # always-present per-student breakdown).
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
    # Every submitted attempt for this cohort's students, across every activity, items
    # included (selectin) in the same query.
    attempts = (
        await db.scalars(
            select(Attempt).where(
                Attempt.user_id.in_(_cohort_students(cohort.id)), Attempt.status == "submitted"
            )
        )
    ).all()
    # (answered, correct) per (outcome_id, user_id), built from every matching item.
    per_student: dict[tuple[uuid.UUID, uuid.UUID], list[int]] = defaultdict(lambda: [0, 0])
    for a in attempts:
        for item in a.items:
            for outcome_id in outcomes_by_item_key.get(item.item_key, []):
                stat = per_student[(outcome_id, a.user_id)]
                stat[0] += 1
                if item.correct:
                    stat[1] += 1
    rows = []
    for outcome in outcomes:
        students = []
        total_answered = total_correct = below_threshold = 0
        for u in members:
            answered, correct = per_student.get((outcome.id, u.id), [0, 0])
            total_answered += answered
            total_correct += correct
            percent = round(100 * correct / answered, 1) if answered else None
            if answered > 0 and percent is not None and percent < cohort.threshold_percent:
                below_threshold += 1
            students.append(
                OutcomeStudentOut(
                    user_id=u.id,
                    display_name=u.display_name,
                    answered=answered,
                    percent_correct=percent,
                )
            )
        rows.append(
            OutcomeRowOut(
                code=outcome.code,
                title=outcome.title,
                questions=len(questions_by_outcome.get(outcome.id, set())),
                answered=total_answered,
                percent_correct=(
                    round(100 * total_correct / total_answered, 1) if total_answered else None
                ),
                students_below_threshold=below_threshold,
                students=students,
            )
        )
    return rows
