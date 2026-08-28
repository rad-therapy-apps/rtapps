import uuid
from typing import Any

from pydantic import BaseModel


class SubjectOut(BaseModel):
    slug: str
    title: str
    order: int
    lesson_count: int


class LessonRefOut(BaseModel):
    slug: str
    title: str
    order: int


class SubjectDetailOut(BaseModel):
    slug: str
    title: str
    summary: str | None
    lessons: list[LessonRefOut]


class LessonOut(BaseModel):
    activity_id: uuid.UUID
    content_version_id: uuid.UUID
    snapshot: dict[str, Any]
