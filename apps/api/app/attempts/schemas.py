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
