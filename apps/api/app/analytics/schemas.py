"""Pydantic response models for `app.analytics.router`: the cohort overview and the
per-student detail view.

What this file does: `ActivityRowOut`/`StudentRowOut` are the two overview tables
(per-activity and per-student aggregates); `CohortOverviewOut` wraps both plus the cohort
itself. `StudentResultOut`/`AttemptItemOut`/`AttemptDetailOut` are the per-student detail
rows; `StudentDetailOut` wraps them plus the student's identity.
Used here and why: plain Pydantic models (no validators) since these are response-only
shapes built entirely from trusted server-side aggregation, never bound to request bodies.
How it fits the project: response contract for FR-E-04/05 (the educator cohort overview
and student detail views); these names appear in the generated `@rtapps/api-client`.
Depends on: `app.cohorts.schemas.CohortOut`, `app.cohorts.schemas.MemberOut`.
Used by: `app.analytics.router`, `app.analytics.queries` (return types).
"""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.cohorts.schemas import CohortOut, MemberOut


class ActivityRowOut(BaseModel):
    # One row per published activity in the overview's activity table.
    activity_id: uuid.UUID
    title: str
    lesson_slug: str | None
    attempted: int
    passed: int
    mean_best_percent: float | None
    below_threshold: bool


class StudentRowOut(BaseModel):
    # One row per student enrollment in the overview's student table.
    user_id: uuid.UUID
    display_name: str
    email: str
    attempted: int
    passed: int
    mean_best_percent: float | None
    below_threshold: bool
    last_activity_at: datetime | None


class CohortOverviewOut(BaseModel):
    # The whole overview response: the cohort itself plus both aggregate tables.
    cohort: CohortOut
    activities: list[ActivityRowOut]
    students: list[StudentRowOut]


class StudentResultOut(BaseModel):
    # One row per activity the student has a rollup for, in the student detail view.
    activity_id: uuid.UUID
    title: str
    lesson_slug: str | None
    best_percent: float | None
    latest_percent: float | None
    attempts: int
    first_passed_at: datetime | None
    mastery: str
    time_spent_s: int


class AttemptItemOut(BaseModel):
    # One graded response within an attempt, in item_key order.
    item_key: str
    response: dict[str, Any]
    correct: bool | None
    score: float | None
    max_score: float | None


class AttemptDetailOut(BaseModel):
    # One submitted attempt, newest first, with its graded items.
    attempt_id: uuid.UUID
    activity_id: uuid.UUID
    title: str
    status: str
    started_at: datetime
    submitted_at: datetime | None
    percent: float | None
    passed: bool | None
    duration_s: int | None
    items: list[AttemptItemOut]


class StudentDetailOut(BaseModel):
    # The whole student detail response: identity, per-activity results, per-attempt detail.
    student: MemberOut
    results: list[StudentResultOut]
    attempts: list[AttemptDetailOut]
