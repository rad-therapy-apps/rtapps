import asyncio
import json
import sys
from pathlib import Path
from typing import Annotated, Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.config import load_settings
from app.content.models import Activity, ContentBlock, Lesson, LessonPage, Question, Subject
from app.content.prose import ProseValidationError, validate_prose
from app.content.service import publish_lesson
from app.db import get_engine, make_session_factory

Prose = dict[str, Any]


def _prose(value: dict[str, Any]) -> dict[str, Any]:
    try:
        validate_prose(value)
    except ProseValidationError as exc:
        raise ValueError(str(exc)) from exc
    return value


class SubjectImport(BaseModel):
    slug: str = Field(pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$", max_length=80)
    title: str = Field(min_length=1, max_length=200)
    order: int = 0


class RichTextImport(BaseModel):
    type: Literal["rich_text"]
    body: Prose

    @field_validator("body")
    @classmethod
    def _body_is_prose(cls, v: dict[str, Any]) -> dict[str, Any]:
        return _prose(v)


class KnowledgeCheckImport(BaseModel):
    type: Literal["knowledge_check"]
    key: str = Field(pattern=r"^[a-z0-9_]+$", max_length=60)
    stem: Prose
    options: list[str] = Field(min_length=2, max_length=10)
    answer: int
    explanation: Prose | None = None

    @field_validator("stem")
    @classmethod
    def _stem_is_prose(cls, v: dict[str, Any]) -> dict[str, Any]:
        return _prose(v)

    @field_validator("explanation")
    @classmethod
    def _explanation_is_prose(cls, v: dict[str, Any] | None) -> dict[str, Any] | None:
        return None if v is None else _prose(v)

    @model_validator(mode="after")
    def _answer_in_range(self) -> "KnowledgeCheckImport":
        if not 0 <= self.answer < len(self.options):
            raise ValueError(f"answer {self.answer} out of range for {len(self.options)} options")
        return self


BlockImport = Annotated[RichTextImport | KnowledgeCheckImport, Field(discriminator="type")]


class PageImport(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    blocks: list[BlockImport] = Field(min_length=1)


class LessonBody(BaseModel):
    slug: str = Field(pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$", max_length=120)
    title: str = Field(min_length=1, max_length=200)
    order: int = 0
    pages: list[PageImport] = Field(min_length=1)

    @model_validator(mode="after")
    def _unique_keys(self) -> "LessonBody":
        seen: set[str] = set()
        for page in self.pages:
            for block in page.blocks:
                if isinstance(block, KnowledgeCheckImport):
                    if block.key in seen:
                        raise ValueError(f"duplicate knowledge_check key {block.key}")
                    seen.add(block.key)
        return self


class LessonImport(BaseModel):
    subject: SubjectImport
    lesson: LessonBody


async def import_lesson(
    db: AsyncSession, doc: LessonImport, *, publish: bool = True, author: User | None = None
) -> Lesson:
    """Create or replace the working copy of a lesson from an import document."""
    subject = await db.scalar(select(Subject).where(Subject.slug == doc.subject.slug))
    if subject is None:
        subject = Subject(slug=doc.subject.slug, title=doc.subject.title, order=doc.subject.order)
        db.add(subject)
        await db.flush()

    lesson = await db.scalar(select(Lesson).where(Lesson.slug == doc.lesson.slug))
    if lesson is None:
        lesson = Lesson(
            subject_id=subject.id,
            slug=doc.lesson.slug,
            title=doc.lesson.title,
            order=doc.lesson.order,
        )
        db.add(
            lesson
        )  # not flushed yet: a pending lesson's `pages` initialises without a lazy load
    else:
        lesson.subject_id, lesson.title, lesson.order = (
            subject.id,
            doc.lesson.title,
            doc.lesson.order,
        )
        await db.refresh(lesson, ["pages"])
        old_question_ids = [b.question_id for p in lesson.pages for b in p.blocks if b.question_id]
        lesson.pages.clear()
        await db.flush()
        for qid in old_question_ids:
            q = await db.get(Question, qid)
            if q is not None:
                await db.delete(q)
        await db.flush()

    # Build the tree through the relationships so the in-memory collections stay accurate
    # (cascades persist pages, blocks and questions on the next flush).
    for order, page in enumerate(doc.lesson.pages, start=1):
        lp = LessonPage(order=order, title=page.title)
        lesson.pages.append(lp)
        for border, block in enumerate(page.blocks, start=1):
            if isinstance(block, RichTextImport):
                lp.blocks.append(ContentBlock(order=border, type="rich_text", body=block.body))
            else:
                q = Question(
                    type="single_choice",
                    stem=block.stem,
                    body={"options": block.options, "answer": block.answer},
                    explanation=block.explanation,
                )
                lp.blocks.append(
                    ContentBlock(
                        order=border,
                        type="knowledge_check",
                        body={"key": block.key},
                        question=q,
                    )
                )
    await db.flush()

    activity = await db.scalar(select(Activity).where(Activity.lesson_id == lesson.id))
    if activity is None:
        activity = Activity(
            kind="lesson",
            ref_id=lesson.id,
            title=lesson.title,
            subject_id=subject.id,
            lesson_id=lesson.id,
        )
        db.add(activity)
    else:
        activity.title, activity.subject_id = lesson.title, subject.id
    await db.flush()

    if publish:
        await publish_lesson(db, lesson, author=author, change_note="import")
    return lesson


async def _run(paths: list[Path]) -> None:
    settings = load_settings()
    engine = get_engine(settings)
    factory = make_session_factory(engine)
    async with factory() as db:
        for path in paths:
            doc = LessonImport.model_validate(json.loads(path.read_text()))
            lesson = await import_lesson(db, doc)
            print(f"imported {lesson.slug} ({len(lesson.pages)} pages)")
        await db.commit()
    await engine.dispose()


def main() -> None:
    if len(sys.argv) < 2:
        print("usage: python -m app.content.importer FILE.json [FILE.json …]", file=sys.stderr)
        sys.exit(2)
    asyncio.run(_run([Path(p) for p in sys.argv[1:]]))


if __name__ == "__main__":
    main()
