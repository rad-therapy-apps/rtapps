"""Pydantic request/response models for `app.attempts.router`.

What this file does: `ItemIn` is the body for grading one knowledge-check response;
`ItemGradeOut` is that call's immediate per-item result; `AttemptOut` is the shape returned
by start/submit; `ResultOut` is one row of a student's own results list.

Used here and why: `AttemptOut` uses `from_attributes=True` to build straight from an
`app.attempts.models.Attempt` ORM row; `ResultOut` doesn't, because `my_results` builds it
by hand from a joined query (attempt columns plus `Activity.title`/`Lesson.slug`) rather
than from a single ORM instance.

How it fits the project: the request/response contract for the ADR-0004 attempt lifecycle;
`ItemGradeOut.explanation` and `AttemptOut`/`ResultOut` never carry an answer key — only
whether the response was correct and the resulting score.

Depends on: nothing in-repo.
Used by: `app/attempts/router.py`.
"""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ItemIn(BaseModel):
    item_key: str = Field(max_length=60)
    response: dict[str, Any]


class ItemGradeOut(BaseModel):
    item_key: str
    correct: bool
    score: float
    max_score: float
    explanation: dict[str, Any] | None


# Response for start_attempt/submit_attempt; from_attributes lets FastAPI serialize the
# Attempt ORM row returned by those routes directly.
class AttemptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    activity_id: uuid.UUID
    content_version_id: uuid.UUID
    status: str
    started_at: datetime
    submitted_at: datetime | None
    score: float | None
    max_score: float | None
    percent: float | None
    passed: bool | None


# One row of GET /me/results; built by hand in my_results from a joined query, not from a
# single ORM instance, hence no from_attributes here.
class ResultOut(BaseModel):
    attempt_id: uuid.UUID
    activity_id: uuid.UUID
    activity_title: str
    lesson_slug: str | None
    percent: float | None
    passed: bool | None
    score: float | None
    max_score: float | None
    submitted_at: datetime | None
