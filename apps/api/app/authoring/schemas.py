"""Pydantic request/response models for `app.authoring.router`'s lesson working-copy routes.

What this file does: request bodies for creating a lesson, editing its meta, and replacing
its page tree, plus the response shapes for the subject/activity listings and the lesson
working copy itself.

Used here and why: `PagesIn` reuses `app.content.importer.PageImport` — the importer's
existing page/block Pydantic model — rather than redefining the page/block shape a second
time; that model is also what raises the prose-validation error a bad request body is
rejected with (see `app.content.importer._prose`), so reusing it is what makes `PUT
.../pages` reject an invalid body the same way the importer does.

How it fits the project: plan 3b Task 8, the authoring API's schema layer sitting between
`app.authoring.router` and the working-copy tables in `app.content.models`.

Depends on: `app.content.importer.PageImport`.
Used by: `app.authoring.router`.
"""

import uuid
from typing import Any

from pydantic import BaseModel, Field

from app.content.importer import PageImport


class LessonCreateIn(BaseModel):
    """Body for `POST /authoring/lessons`: the subject to file it under plus its meta."""

    subject_slug: str
    title: str = Field(min_length=1, max_length=200)
    slug: str = Field(min_length=1, max_length=120, pattern=r"^[a-z0-9][a-z0-9-]*$")


class LessonMetaIn(BaseModel):
    """Body for `PUT /authoring/lessons/{id}`: meta only, no pages."""

    title: str = Field(min_length=1, max_length=200)
    slug: str = Field(min_length=1, max_length=120, pattern=r"^[a-z0-9][a-z0-9-]*$")


class PagesIn(BaseModel):
    """Body for `PUT /authoring/lessons/{id}/pages`: the complete replacement page tree."""

    pages: list[PageImport]


class ActivityAuthorRow(BaseModel):
    """One row of `GET /authoring/subjects/{slug}/activities`."""

    activity_id: uuid.UUID
    kind: str
    title: str
    slug: str | None
    status: str
    access: str
    needs_review: bool
    import_notes: list[str]


class SubjectAuthorOut(BaseModel):
    """One row of `GET /authoring/subjects`: every subject, regardless of publish status."""

    id: uuid.UUID
    slug: str
    title: str
    activity_count: int


class LessonAuthorOut(BaseModel):
    """The lesson working copy: meta plus the unstripped page tree (answers included) —

    Task 15's editor consumes this verbatim.
    """

    activity_id: uuid.UUID
    lesson_id: uuid.UUID
    subject_slug: str
    slug: str
    title: str
    status: str
    import_notes: list[str]
    pages: list[dict[str, Any]]
