"""Student-facing read API for published curriculum content.

What this file does: four GET routes — list subjects with a published-lesson count, one
subject's published lessons, one lesson's current published snapshot with answer keys
removed, and one activity's current published snapshot with answer keys removed. There is
no write path here; authoring goes through `app.content.importer` (and, eventually, an
authoring UI) instead.

Used here and why: a FastAPI `APIRouter` with `require_user` applied to the whole router
(every route needs a logged-in session, even though nothing here is role-gated) so no
individual route can forget the auth dependency.

How it fits the project: this is the "serve" end of the content pipeline (ADR-0003) —
every route only ever reads rows with `status == "published"` or a lesson/activity's
`current_version_id`; the underlying working-copy edits and unpublished drafts are never
reachable from here.

Works with:
  Depends on: `app.auth.deps.require_user` (session dependency), `app.auth.models` (User,
    UserRole), `app.content.models` (Activity, ContentVersion, Lesson, Subject),
    `app.content.schemas` (response models), `app.content.snapshot.strip_answers`,
    `app.content.activity_snapshots.strip_activity_answers`, `app.db.get_session`,
    `app.errors.Problem`.
  Used by: `app.main` mounts this router under the API prefix.
"""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import require_user
from app.auth.models import User, UserRole
from app.content.activity_snapshots import strip_activity_answers
from app.content.models import Activity, ContentVersion, Lesson, Subject
from app.content.schemas import (
    ActivityOut,
    ActivityRefOut,
    LessonOut,
    LessonRefOut,
    SdkSlugOut,
    SubjectDetailOut,
    SubjectOut,
)
from app.content.snapshot import strip_answers
from app.db import get_session
from app.errors import Problem

router = APIRouter(tags=["content"], dependencies=[Depends(require_user)])


@router.get("/subjects", response_model=list[SubjectOut])
async def list_subjects(db: AsyncSession = Depends(get_session)) -> list[SubjectOut]:
    """List subjects that have at least one published activity, with lesson and activity
    counts.
    """
    rows = (
        await db.execute(
            select(
                Subject,
                func.count(Activity.id).filter(Activity.kind == "lesson"),
                func.count(Activity.id),
            )
            .join(Activity)
            .where(Activity.status == "published", Activity.access == "practice")
            .group_by(Subject.id)
            .order_by(Subject.order, Subject.slug)
        )
    ).all()
    return [
        SubjectOut(
            slug=subject.slug,
            title=subject.title,
            order=subject.order,
            lesson_count=lesson_count,
            activity_count=activity_count,
        )
        for subject, lesson_count, activity_count in rows
    ]


@router.get("/subjects/{slug}", response_model=SubjectDetailOut)
async def get_subject(slug: str, db: AsyncSession = Depends(get_session)) -> SubjectDetailOut:
    """One subject with its published lessons and practice non-lesson activities; 404s only
    when the subject has neither published lessons nor published practice activities.
    """
    subject = await db.scalar(select(Subject).where(Subject.slug == slug))
    if subject is None:
        raise Problem(404, "Subject not found")
    lessons = (
        await db.scalars(
            select(Lesson)
            .where(Lesson.subject_id == subject.id, Lesson.status == "published")
            .order_by(Lesson.order, Lesson.slug)
        )
    ).all()
    activities = (
        await db.scalars(
            select(Activity)
            .where(
                Activity.subject_id == subject.id,
                Activity.status == "published",
                Activity.access == "practice",
                Activity.kind != "lesson",
            )
            .order_by(Activity.title)
        )
    ).all()
    if not lessons and not activities:
        raise Problem(404, "Subject not found")
    return SubjectDetailOut(
        slug=subject.slug,
        title=subject.title,
        summary=subject.summary,
        lessons=[
            LessonRefOut(slug=lesson.slug, title=lesson.title, order=lesson.order)
            for lesson in lessons
        ],
        activities=[
            ActivityRefOut(id=activity.id, kind=activity.kind, title=activity.title)
            for activity in activities
        ],
    )


@router.get("/activities/by-sdk-slug/{slug}", response_model=SdkSlugOut)
async def resolve_sdk_slug(
    slug: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_session),
) -> SdkSlugOut:
    """Plan 4c: name → activity for the simulator SDK. Matches on the LIVE activity
    config (not a snapshot): the slug is an addressing convention, and only published
    external activities resolve.

    Filters in Python rather than with a JSONB `->>` SQL comparison: there is no existing
    precedent in this codebase for querying `Activity.config` on the SQL side (every other
    call site reads it as a plain Python dict after fetching the row), and external
    activities number in the dozens at most, so a Python-side filter over that small,
    already-indexed-by-kind-and-status set is simpler than introducing a new query idiom.
    """
    activities = (
        await db.scalars(
            select(Activity).where(Activity.kind == "external", Activity.status == "published")
        )
    ).all()
    activity = next((a for a in activities if a.config.get("sdk_slug") == slug), None)
    if activity is None:
        raise Problem(404, "No published activity with that sdk_slug")
    subject = await db.get(Subject, activity.subject_id)
    assert subject is not None
    return SdkSlugOut(
        activity_id=activity.id,
        subject_slug=subject.slug,
        completion_only=bool(activity.config.get("completion_only")),
        max_score=activity.config.get("max_score"),
    )


@router.get("/activities/{activity_id}", response_model=ActivityOut)
async def get_activity(
    activity_id: uuid.UUID,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_session),
) -> ActivityOut:
    """One activity's current published snapshot, answers stripped.

    ADR-0006: students never see assessment activities — same 404 as a missing id.
    """
    activity = await db.get(Activity, activity_id)
    if activity is None or activity.status != "published" or activity.current_version_id is None:
        raise Problem(404, "Activity not found")
    if activity.access != "practice" and user.role == UserRole.student:
        raise Problem(404, "Activity not found")
    version = await db.get(ContentVersion, activity.current_version_id)
    if version is None:
        raise Problem(404, "Activity not found")
    return ActivityOut(
        activity_id=activity.id,
        content_version_id=version.id,
        kind=activity.kind,
        snapshot=strip_activity_answers(version.snapshot),
    )


@router.get("/lessons/{slug}", response_model=LessonOut)
async def get_lesson(slug: str, db: AsyncSession = Depends(get_session)) -> LessonOut:
    """Serve a lesson's current published snapshot with answer keys stripped.

    Requires both `status == "published"` and a `current_version_id` to be set — the two
    are kept in sync by `publish_lesson`, but checking both is cheap insurance against a
    lesson that's mid-migration or otherwise inconsistent.
    """
    lesson = await db.scalar(select(Lesson).where(Lesson.slug == slug))
    if lesson is None or lesson.status != "published" or lesson.current_version_id is None:
        raise Problem(404, "Lesson not found")
    version = await db.get(ContentVersion, lesson.current_version_id)
    if version is None:
        raise Problem(404, "Lesson not found")
    return LessonOut(
        activity_id=version.activity_id,
        content_version_id=version.id,
        # strip_answers: this is the one place unstripped snapshot data could otherwise
        # leak to a student — never skip it on this route.
        snapshot=strip_answers(version.snapshot),
    )
