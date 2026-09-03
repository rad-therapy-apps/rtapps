"""Authoring API for lesson working copies: subject/activity listings, draft-lesson CRUD,
and whole-page-tree replace.

What this file does: `GET /subjects` and `GET /subjects/{slug}/activities` let an author
browse what exists (any status, not just published); `POST /lessons` creates a draft lesson
+ paired draft activity; `GET/PUT /lessons/{id}` read/edit its meta; `PUT
/lessons/{id}/pages` replaces its whole page tree. Every route here edits the *working
copy* only — publishing (Task 10) is a separate step, so an author can save an in-progress
edit to a published lesson without it reaching students until they explicitly publish.

Used here and why: `build_snapshot` (the same function `publish_lesson` freezes into a
`content_version`) is reused verbatim for the `GET`s here — it already returns the
unstripped tree (answers included), which is exactly the author view and exactly what
Task 15's editor needs; `app.content.importer.replace_lesson_pages` (extracted from
`import_lesson` in this task) is reused verbatim for `PUT .../pages` so the importer and
the authoring UI can never drift apart on how a page tree is written. Slug uniqueness is
enforced by pre-check SELECT (the common-case fast path, no exception handling) with the
database's unique constraint kept as an `IntegrityError` backstop for the race window
between check and write — the same pattern `app.cohorts.router` uses for join codes.

How it fits the project: plan 3b Task 8 — the "Kevin fixes a migrated lesson" milestone's
backend. `dependencies=[Depends(require_author)]` at router level (not per-route) means no
route here can be added later without the educator/admin gate.

Depends on: `app.authoring.deps.require_author`, `app.authoring.schemas` (all request/
response models), `app.content.activity_models` (Quiz/FlashcardDeck/MatchingActivity/
SequencingActivity, for `slug_by_ref`), `app.content.importer` (`ProseValidationError`,
`replace_lesson_pages`), `app.content.models` (Activity, Lesson, Subject),
`app.content.snapshot.build_snapshot`, `app.db.get_session`, `app.errors.Problem`.
Used by: `app.main` (mounted); `tests/test_authoring_lessons.py`; Task 9 reuses
`slug_by_ref` for the non-lesson authoring routes.
"""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.authoring.deps import require_author
from app.authoring.schemas import (
    ActivityAuthorRow,
    LessonAuthorOut,
    LessonCreateIn,
    LessonMetaIn,
    PagesIn,
    SubjectAuthorOut,
)
from app.content.activity_models import FlashcardDeck, MatchingActivity, Quiz, SequencingActivity
from app.content.importer import replace_lesson_pages
from app.content.models import Activity, Lesson, Subject
from app.content.prose import ProseValidationError
from app.content.snapshot import build_snapshot
from app.db import get_session
from app.errors import Problem

router = APIRouter(prefix="/authoring", tags=["authoring"], dependencies=[Depends(require_author)])

# Non-lesson activity kinds that have a per-activity working-copy row of their own, keyed
# by `Activity.kind`, for `slug_by_ref` below. "calculator" is deliberately absent: its
# working copy (a `DataTable`) is a shared, keyed lookup, not a 1:1 per-activity row.
_SLUG_MODELS: dict[str, type[Any]] = {
    "quiz": Quiz,
    "flashcards": FlashcardDeck,
    "matching": MatchingActivity,
    "sequencing": SequencingActivity,
}


async def slug_by_ref(db: AsyncSession, activity: Activity) -> str | None:
    """The working-copy slug for one activity, resolved by kind via its `ref_id`.

    `None` for calculator (no per-activity working-copy row to have a slug at all). Task 9's
    non-lesson authoring routes reuse this directly.
    """
    if activity.kind == "lesson":
        lesson = await db.get(Lesson, activity.ref_id)
        return lesson.slug if lesson else None
    model = _SLUG_MODELS.get(activity.kind)
    if model is None:
        return None
    row = await db.get(model, activity.ref_id)
    return row.slug if row else None


async def _get_activity_for_lesson(db: AsyncSession, lesson: Lesson) -> Activity:
    """The activity paired 1:1 with `lesson` (see `Activity.lesson_id`, unique=True).

    Every lesson created through this router (or the importer) has one, so a miss here
    means the lesson id itself doesn't resolve to anything an author can act on.
    """
    activity = await db.scalar(select(Activity).where(Activity.lesson_id == lesson.id))
    if activity is None:
        raise Problem(404, "Lesson not found")
    return activity


def _author_out(
    lesson: Lesson, activity: Activity, subject: Subject, snapshot: dict[str, Any]
) -> LessonAuthorOut:
    """Build the one response shape every lesson route below returns."""
    return LessonAuthorOut(
        activity_id=activity.id,
        lesson_id=lesson.id,
        subject_slug=subject.slug,
        slug=lesson.slug,
        title=lesson.title,
        status=activity.status,
        import_notes=list(activity.config.get("import_notes", [])),
        pages=snapshot["lesson"]["pages"],
    )


@router.get("/subjects", response_model=list[SubjectAuthorOut])
async def list_subjects(db: AsyncSession = Depends(get_session)) -> list[SubjectAuthorOut]:
    """Every subject (any status), with a total activity count — unlike the student-facing
    `app.content.router.list_subjects`, drafts count too.
    """
    rows = (
        await db.execute(
            select(Subject, func.count(Activity.id))
            .outerjoin(Activity, Activity.subject_id == Subject.id)
            .group_by(Subject.id)
            .order_by(Subject.order, Subject.slug)
        )
    ).all()
    return [
        SubjectAuthorOut(
            id=subject.id, slug=subject.slug, title=subject.title, activity_count=count
        )
        for subject, count in rows
    ]


@router.get("/subjects/{slug}/activities", response_model=list[ActivityAuthorRow])
async def list_subject_activities(
    slug: str, db: AsyncSession = Depends(get_session)
) -> list[ActivityAuthorRow]:
    """Every activity in one subject (any status), flagged `needs_review` when the importer
    left notes behind (`Activity.config["import_notes"]`, Task 4) — the migrated-content
    review queue.
    """
    subject = await db.scalar(select(Subject).where(Subject.slug == slug))
    if subject is None:
        raise Problem(404, "Subject not found")
    activities = (
        await db.scalars(
            select(Activity).where(Activity.subject_id == subject.id).order_by(Activity.title)
        )
    ).all()
    rows = []
    for activity in activities:
        notes = list(activity.config.get("import_notes", []))
        rows.append(
            ActivityAuthorRow(
                activity_id=activity.id,
                kind=activity.kind,
                title=activity.title,
                slug=await slug_by_ref(db, activity),
                status=activity.status,
                access=activity.access,
                needs_review=bool(notes),
                import_notes=notes,
            )
        )
    return rows


@router.post("/lessons", response_model=LessonAuthorOut, status_code=status.HTTP_201_CREATED)
async def create_lesson(
    payload: LessonCreateIn, db: AsyncSession = Depends(get_session)
) -> LessonAuthorOut:
    """Create a draft lesson with an empty page tree, plus its paired draft activity
    (kind "lesson", access "practice") — the starting point for a from-scratch author, or
    for pasting in pages via the follow-up `PUT .../pages` call.
    """
    subject = await db.scalar(select(Subject).where(Subject.slug == payload.subject_slug))
    if subject is None:
        raise Problem(404, "Subject not found")
    # Pre-check: the common-case fast path needs no exception handling; the unique
    # constraint on Lesson.slug is the backstop for the check-then-write race below.
    if await db.scalar(select(Lesson.id).where(Lesson.slug == payload.slug)) is not None:
        raise Problem(409, "A lesson with that slug already exists")
    lesson = Lesson(subject_id=subject.id, slug=payload.slug, title=payload.title)
    db.add(lesson)
    await db.flush()  # assigns lesson.id before the activity below points ref_id/lesson_id at it
    activity = Activity(
        kind="lesson",
        ref_id=lesson.id,
        title=lesson.title,
        subject_id=subject.id,
        lesson_id=lesson.id,
        status="draft",
        access="practice",
    )
    db.add(activity)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise Problem(409, "A lesson with that slug already exists") from exc
    # `lesson` was created via the constructor + flush, never a SELECT, so its `pages`
    # relationship (lazy="selectin") was never eager-loaded the way a queried Lesson's is;
    # an explicit async refresh avoids `build_snapshot` triggering an implicit lazy load
    # outside a greenlet context (it's empty either way — a brand-new lesson has no pages).
    await db.refresh(lesson, ["pages"])
    snapshot = await build_snapshot(db, lesson)
    return _author_out(lesson, activity, subject, snapshot)


@router.get("/lessons/{lesson_id}", response_model=LessonAuthorOut)
async def get_lesson(
    lesson_id: uuid.UUID, db: AsyncSession = Depends(get_session)
) -> LessonAuthorOut:
    """The lesson working copy: meta plus the unstripped page tree (answers included) —
    the author's own edits, regardless of what's currently published.
    """
    lesson = await db.get(Lesson, lesson_id)
    if lesson is None:
        raise Problem(404, "Lesson not found")
    activity = await _get_activity_for_lesson(db, lesson)
    subject = await db.get(Subject, lesson.subject_id)
    assert subject is not None  # Lesson.subject_id is NOT NULL with an ondelete=CASCADE FK
    snapshot = await build_snapshot(db, lesson)
    return _author_out(lesson, activity, subject, snapshot)


@router.put("/lessons/{lesson_id}", response_model=LessonAuthorOut)
async def update_lesson_meta(
    lesson_id: uuid.UUID, payload: LessonMetaIn, db: AsyncSession = Depends(get_session)
) -> LessonAuthorOut:
    """Retitle/reslug a lesson; its pages are untouched (use `PUT .../pages` for those)."""
    lesson = await db.get(Lesson, lesson_id)
    if lesson is None:
        raise Problem(404, "Lesson not found")
    activity = await _get_activity_for_lesson(db, lesson)
    if payload.slug != lesson.slug:
        collision = await db.scalar(select(Lesson.id).where(Lesson.slug == payload.slug))
        if collision is not None:
            raise Problem(409, "A lesson with that slug already exists")
    lesson.title, lesson.slug = payload.title, payload.slug
    activity.title = payload.title  # kept 1:1 with the lesson, same as the importer does
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise Problem(409, "A lesson with that slug already exists") from exc
    subject = await db.get(Subject, lesson.subject_id)
    assert subject is not None
    snapshot = await build_snapshot(db, lesson)
    return _author_out(lesson, activity, subject, snapshot)


@router.put("/lessons/{lesson_id}/pages", response_model=LessonAuthorOut)
async def replace_pages(
    lesson_id: uuid.UUID, payload: PagesIn, db: AsyncSession = Depends(get_session)
) -> LessonAuthorOut:
    """Replace the lesson's whole page tree — edit, not publish: the served student
    snapshot (if any) is unchanged until a separate publish (Task 10).
    """
    lesson = await db.get(Lesson, lesson_id)
    if lesson is None:
        raise Problem(404, "Lesson not found")
    activity = await _get_activity_for_lesson(db, lesson)
    try:
        await replace_lesson_pages(db, lesson, payload.pages)
    except ProseValidationError as exc:  # pragma: no cover - PageImport validates first
        # `PagesIn.pages: list[PageImport]` already validates prose bodies at request-body
        # parsing time (FastAPI's own 422, path included) via PageImport's field
        # validators; this is a backstop for a document that somehow got past that.
        raise Problem(422, str(exc)) from exc
    await db.commit()
    subject = await db.get(Subject, lesson.subject_id)
    assert subject is not None
    snapshot = await build_snapshot(db, lesson)
    return _author_out(lesson, activity, subject, snapshot)
