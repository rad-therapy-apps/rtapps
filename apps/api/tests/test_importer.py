import json
from pathlib import Path

import pytest
from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.content.importer import LessonImport, import_lesson
from app.content.models import Activity, ContentVersion, Lesson, Question

FIXTURE = json.loads((Path(__file__).parent / "fixtures/lesson_min.json").read_text())


async def test_import_creates_tree_activity_and_publishes(db: AsyncSession) -> None:
    lesson = await import_lesson(db, LessonImport.model_validate(FIXTURE))
    assert lesson.status == "published" and lesson.current_version_id is not None
    activity = await db.scalar(select(Activity).where(Activity.lesson_id == lesson.id))
    assert activity is not None and activity.current_version_id == lesson.current_version_id
    assert activity.title == "RBE and OER" and activity.ref_id == lesson.id


async def test_reimport_replaces_pages_keeps_ids_and_bumps_version(db: AsyncSession) -> None:
    first = await import_lesson(db, LessonImport.model_validate(FIXTURE))
    doc = json.loads(json.dumps(FIXTURE))
    doc["lesson"]["pages"] = doc["lesson"]["pages"][:1]
    second = await import_lesson(db, LessonImport.model_validate(doc))
    assert second.id == first.id and len(second.pages) == 1
    assert (await db.scalar(select(func.count()).select_from(Question))) == 0
    activity = await db.scalar(select(Activity).where(Activity.lesson_id == first.id))
    assert activity is not None
    versions = await db.scalar(select(func.count()).select_from(ContentVersion))
    assert versions == 2


def test_import_rejects_invalid_prose_and_bad_answer() -> None:
    bad = json.loads(json.dumps(FIXTURE))
    bad["lesson"]["pages"][0]["blocks"][0]["body"] = {
        "type": "doc",
        "content": [{"type": "script"}],
    }
    with pytest.raises(ValidationError, match="content"):
        LessonImport.model_validate(bad)
    bad = json.loads(json.dumps(FIXTURE))
    bad["lesson"]["pages"][1]["blocks"][1]["answer"] = 5
    with pytest.raises(ValidationError, match="answer"):
        LessonImport.model_validate(bad)


def test_duplicate_keys_rejected() -> None:
    bad = json.loads(json.dumps(FIXTURE))
    bad["lesson"]["pages"][0]["blocks"].append(dict(bad["lesson"]["pages"][1]["blocks"][1]))
    with pytest.raises(ValidationError, match="lq_page2_1"):
        LessonImport.model_validate(bad)


async def test_lesson_count_after_import(db: AsyncSession) -> None:
    await import_lesson(db, LessonImport.model_validate(FIXTURE))
    assert (await db.scalar(select(func.count()).select_from(Lesson))) == 1
