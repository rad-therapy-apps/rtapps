from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import require_user
from app.content.models import ContentVersion, Lesson, Subject
from app.content.schemas import LessonOut, LessonRefOut, SubjectDetailOut, SubjectOut
from app.content.snapshot import strip_answers
from app.db import get_session
from app.errors import Problem

router = APIRouter(tags=["content"], dependencies=[Depends(require_user)])


@router.get("/subjects", response_model=list[SubjectOut])
async def list_subjects(db: AsyncSession = Depends(get_session)) -> list[SubjectOut]:
    rows = (
        await db.execute(
            select(Subject, func.count(Lesson.id))
            .join(Lesson)
            .where(Lesson.status == "published")
            .group_by(Subject.id)
            .order_by(Subject.order, Subject.slug)
        )
    ).all()
    return [
        SubjectOut(slug=subject.slug, title=subject.title, order=subject.order, lesson_count=count)
        for subject, count in rows
    ]


@router.get("/subjects/{slug}", response_model=SubjectDetailOut)
async def get_subject(slug: str, db: AsyncSession = Depends(get_session)) -> SubjectDetailOut:
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
    if not lessons:
        raise Problem(404, "Subject not found")
    return SubjectDetailOut(
        slug=subject.slug,
        title=subject.title,
        summary=subject.summary,
        lessons=[
            LessonRefOut(slug=lesson.slug, title=lesson.title, order=lesson.order)
            for lesson in lessons
        ],
    )


@router.get("/lessons/{slug}", response_model=LessonOut)
async def get_lesson(slug: str, db: AsyncSession = Depends(get_session)) -> LessonOut:
    lesson = await db.scalar(select(Lesson).where(Lesson.slug == slug))
    if lesson is None or lesson.status != "published" or lesson.current_version_id is None:
        raise Problem(404, "Lesson not found")
    version = await db.get(ContentVersion, lesson.current_version_id)
    if version is None:
        raise Problem(404, "Lesson not found")
    return LessonOut(
        activity_id=version.activity_id,
        content_version_id=version.id,
        snapshot=strip_answers(version.snapshot),
    )
