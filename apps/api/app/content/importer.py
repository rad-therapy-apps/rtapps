"""Validates a JSON lesson document and writes/replaces its working copy in the database.

What this file does: `LessonImport` (and its nested Pydantic models) is the schema for the
JSON files fed to this tool — one subject plus one lesson with pages and blocks.
`import_lesson` creates the subject/lesson/activity rows if they don't exist, or replaces
an existing lesson's pages/blocks/questions wholesale, then publishes by default. A small
CLI (`main`/`_run`) lets this run as `python -m app.content.importer FILE.json ...`, which
is how `tools/migrate-legacy` (converting the old workbook HTML) and `app/seed.py` load
content.

Used here and why: Pydantic v2 models with `field_validator`/`model_validator` so a bad
import document is rejected with a clear error before anything touches the database — the
same closed-prose-schema check (`app.content.prose`) that the editor and renderer share
also gates this import path (ADR-0003), so imported content can't smuggle in an HTML/script
payload the schema wouldn't allow either.

How it fits the project: this is the "authored" end of the content pipeline — before an
in-app authoring UI exists, this importer plus hand-written/migrated JSON files are how
lessons get into the working-copy tables that `app.content.service.publish_lesson` then
snapshots.

Works with:
  Depends on: `app.auth.models.User` (attributes a publish), `app.config.load_settings` +
    `app.db` (CLI's own DB session), `app.content.models` (the tables written to),
    `app.content.prose` (prose validation), `app.content.service.publish_lesson`.
  Used by: `app.seed` and the content/importer test modules import `LessonImport` and
    `import_lesson` directly; the CLI entry point (`main`) is invoked as a module script;
    `app.authoring.router` reuses `PageImport` (the page/block shape) and
    `replace_lesson_pages` (the delete-then-rebuild body extracted from `import_lesson`) for
    the `PUT /authoring/lessons/{id}/pages` route.
"""

import asyncio
import json
import sys
from pathlib import Path
from typing import Annotated, Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy import inspect, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.config import load_settings
from app.content.models import Activity, ContentBlock, Lesson, LessonPage, Question, Subject
from app.content.prose import ProseValidationError, validate_prose
from app.content.service import publish_lesson
from app.db import get_engine, make_session_factory

Prose = dict[str, Any]


def _prose(value: dict[str, Any]) -> dict[str, Any]:
    """Pydantic-validator adapter: re-raise `ProseValidationError` as `ValueError` so it

    surfaces as a normal Pydantic field error instead of a distinct exception type.
    """
    try:
        validate_prose(value)
    except ProseValidationError as exc:
        raise ValueError(str(exc)) from exc
    return value


class SubjectImport(BaseModel):
    """The subject a lesson belongs to; matched/created by `slug` in `import_lesson`."""

    slug: str = Field(pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$", max_length=80)
    title: str = Field(min_length=1, max_length=200)
    order: int = 0


class RichTextImport(BaseModel):
    """A prose content block; `body` must already be closed-schema ProseMirror JSON."""

    type: Literal["rich_text"]
    body: Prose

    @field_validator("body")
    @classmethod
    def _body_is_prose(cls, v: dict[str, Any]) -> dict[str, Any]:
        return _prose(v)


class KnowledgeCheckImport(BaseModel):
    """A single_choice question block. `key` is the stable id grading looks up later, so

    it's validated here (lowercase/underscore, ASCII) and checked for lesson-wide
    uniqueness in `LessonBody._unique_keys` below.
    """

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
        """Reject an `answer` index that doesn't point at one of `options`."""
        if not 0 <= self.answer < len(self.options):
            raise ValueError(f"answer {self.answer} out of range for {len(self.options)} options")
        return self


# Discriminated union on `type`: Pydantic picks RichTextImport vs. KnowledgeCheckImport by
# that field alone, so a block's shape can't be ambiguous or silently coerced into the
# wrong model.
BlockImport = Annotated[RichTextImport | KnowledgeCheckImport, Field(discriminator="type")]


class PageImport(BaseModel):
    """One lesson page: a title plus an ordered, non-empty list of blocks."""

    title: str = Field(min_length=1, max_length=200)
    blocks: list[BlockImport] = Field(min_length=1)


class LessonBody(BaseModel):
    """The lesson itself: slug/title/order plus its pages."""

    slug: str = Field(pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$", max_length=120)
    title: str = Field(min_length=1, max_length=200)
    order: int = 0
    pages: list[PageImport] = Field(min_length=1)

    @model_validator(mode="after")
    def _unique_keys(self) -> "LessonBody":
        """A knowledge_check `key` must be unique across the whole lesson (grading indexes

        by key alone; a duplicate would make one attempt item ambiguous).
        """
        seen: set[str] = set()
        for page in self.pages:
            for block in page.blocks:
                if isinstance(block, KnowledgeCheckImport):
                    if block.key in seen:
                        raise ValueError(f"duplicate knowledge_check key {block.key}")
                    seen.add(block.key)
        return self


class LessonImport(BaseModel):
    """Top-level import document shape: one subject plus one lesson."""

    subject: SubjectImport
    lesson: LessonBody
    # Converter notes travelling with a migrated document; surfaced as the authoring
    # UI's needs-review queue via activity.config["import_notes"] (plan 3b).
    import_notes: list[str] = Field(default_factory=list)


async def _upsert_subject(db: AsyncSession, doc: SubjectImport) -> Subject:
    """Reuse an existing subject by slug, or create it on first import."""
    subject = await db.scalar(select(Subject).where(Subject.slug == doc.slug))
    if subject is None:
        subject = Subject(slug=doc.slug, title=doc.title, order=doc.order)
        db.add(subject)
        await db.flush()
    return subject


async def replace_lesson_pages(db: AsyncSession, lesson: Lesson, pages: list[PageImport]) -> None:
    """Replace `lesson`'s whole page/block/question tree in place, delete-then-rebuild (not
    diff) — `pages` is taken as the complete lesson. Shared by `import_lesson`'s reimport
    path and the authoring `PUT /authoring/lessons/{id}/pages` route (`app.authoring.router`),
    so both write paths delete/insert exactly the same way.

    `inspect(lesson).pending` distinguishes a brand-new, not-yet-flushed lesson (nothing to
    delete — a pending object's `pages` collection initialises empty without a lazy load)
    from an existing one, whose old tree must be cleared first.
    """
    if not inspect(lesson).pending:
        # Reimport delete ordering matters here because of ContentBlock.question_id's
        # ondelete="RESTRICT": a Question row can't be deleted while a block still points
        # at it. So (1) collect the old question ids first, (2) clear the pages collection
        # and flush — cascade="all, delete-orphan" deletes the old pages and blocks, freeing
        # the questions from their RESTRICT — then (3) delete those now-orphaned questions.
        # Doing it in the other order would raise a foreign-key violation.
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
    for order, page in enumerate(pages, start=1):
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


async def import_lesson(
    db: AsyncSession, doc: LessonImport, *, publish: bool = True, author: User | None = None
) -> Lesson:
    """Create or replace the working copy of a lesson from an import document."""
    # Subject upsert by slug: reuse an existing subject, or create it on first import.
    subject = await _upsert_subject(db, doc.subject)

    # Lesson upsert by slug: a brand-new lesson is just created; re-importing an existing
    # one (same slug) replaces its whole page/block/question tree from scratch below,
    # since the importer's contract is "this document is the complete lesson".
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

    await replace_lesson_pages(db, lesson, doc.lesson.pages)

    # Activity upsert, kept 1:1 with the lesson (see Activity.lesson_id unique=True):
    # created alongside a brand-new lesson, or just re-titled if the lesson already had one.
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

    config = dict(activity.config or {})
    if doc.import_notes:
        config["import_notes"] = doc.import_notes
    else:
        config.pop("import_notes", None)
    activity.config = config
    await db.flush()

    # Publishing here (rather than leaving the caller to do it) is what makes an import
    # immediately visible to students by default; `publish=False` is for callers that want
    # to stage a working copy without freezing a version yet.
    if publish:
        await publish_lesson(db, lesson, author=author, change_note="import")
    return lesson


async def _run(paths: list[Path]) -> None:
    """CLI body: import each file in its own pass, commit once at the end."""
    from app.content.activity_importer import import_any

    settings = load_settings()
    engine = get_engine(settings)
    factory = make_session_factory(engine)
    async with factory() as db:
        for path in paths:
            doc = json.loads(path.read_text())
            activity = await import_any(db, doc)
            print(f"imported {activity.kind} {activity.title}")
        await db.commit()
    await engine.dispose()


def main() -> None:
    """Entry point for `python -m app.content.importer FILE.json ...`."""
    if len(sys.argv) < 2:
        print("usage: python -m app.content.importer FILE.json [FILE.json …]", file=sys.stderr)
        sys.exit(2)
    asyncio.run(_run([Path(p) for p in sys.argv[1:]]))


if __name__ == "__main__":
    main()
