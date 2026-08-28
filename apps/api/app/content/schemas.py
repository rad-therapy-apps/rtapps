"""What this file does: Pydantic response models for `app.content.router` — the
OpenAPI-visible shapes the student-facing content API returns. No request bodies here;
every route in that router is a GET.

Used here and why: plain Pydantic `BaseModel`s (not ORM `from_attributes` models like
`app.attempts.schemas`) because these are built by hand from query results/snapshot dicts
in the router rather than returned straight from an ORM row.

How it fits the project: these are the outer envelope around the stripped
`content_version.snapshot` (ADR-0003) — `LessonOut.snapshot` is that document's shape,
which is documented by the ProseMirror/prose-doc schema rather than by a Pydantic model.

Works with:
  Used by: `app.content.router` (all four response models).
"""

import uuid
from typing import Any

from pydantic import BaseModel


class SubjectOut(BaseModel):
    """One row of `GET /subjects`: a subject plus its published-lesson count."""

    slug: str
    title: str
    order: int
    lesson_count: int


class LessonRefOut(BaseModel):
    """A lesson reference nested inside `SubjectDetailOut` (no snapshot, just enough to

    list and link to it).
    """

    slug: str
    title: str
    order: int


class SubjectDetailOut(BaseModel):
    """Response for `GET /subjects/{slug}`: one subject with its published lessons."""

    slug: str
    title: str
    summary: str | None
    lessons: list[LessonRefOut]


class LessonOut(BaseModel):
    """Response for `GET /lessons/{slug}`: the pinned version id (what an attempt should

    reference) plus the answer-stripped snapshot itself.
    """

    activity_id: uuid.UUID
    content_version_id: uuid.UUID
    snapshot: dict[str, Any]
