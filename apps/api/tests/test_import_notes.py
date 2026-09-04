"""Tests that importer-carried notes land in activity.config["import_notes"].

What this file does: imports a lesson document and a quiz document that carry
import_notes and asserts the paired Activity.config mirrors them; re-importing the
same document without notes removes the key.
Used here and why: same async db fixture + document-builder style as
test_activity_importer.py / test_importer.py.
How it fits the project: plan 3b Task 4 — the notes power the authoring needs-review queue.
Works with: app.content.importer.import_lesson, app.content.activity_importer.import_any.
"""

import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.content.activity_importer import import_any
from app.content.importer import LessonImport, import_lesson
from app.content.models import Activity

LESSON_FIXTURE = json.loads((Path(__file__).parent / "fixtures/lesson_min.json").read_text())

SUBJECT = {"slug": "radiation-biology", "title": "Radiation Biology", "order": 1}
QUIZ_DOC = {
    "subject": SUBJECT,
    "quiz": {
        "slug": "ars-quiz",
        "title": "ARS Quiz",
        "pass_percent": 80,
        "shuffle": True,
        "questions": [
            {"stem": "Q1?", "options": ["A", "B", "C"], "answer": 0},
        ],
    },
}


async def test_lesson_import_notes_stored(db: AsyncSession) -> None:
    doc = json.loads(json.dumps(LESSON_FIXTURE))
    doc["import_notes"] = ["no correct answer for q_page1_1_ans", "img placeholder (a.png)"]
    lesson = await import_lesson(db, LessonImport.model_validate(doc))
    activity = await db.scalar(select(Activity).where(Activity.lesson_id == lesson.id))
    assert activity is not None
    assert activity.config["import_notes"] == doc["import_notes"]


async def test_reimport_without_notes_clears_key(db: AsyncSession) -> None:
    doc = json.loads(json.dumps(LESSON_FIXTURE))
    doc["import_notes"] = ["img placeholder (a.png)"]
    await import_lesson(db, LessonImport.model_validate(doc))
    clean = json.loads(json.dumps(LESSON_FIXTURE))
    lesson = await import_lesson(db, LessonImport.model_validate(clean))
    activity = await db.scalar(select(Activity).where(Activity.lesson_id == lesson.id))
    assert activity is not None
    assert "import_notes" not in activity.config


async def test_quiz_import_notes_stored(db: AsyncSession) -> None:
    doc = json.loads(json.dumps(QUIZ_DOC))
    doc["import_notes"] = ["normalised key Q1 → q1"]
    activity = await import_any(db, doc)
    assert activity.config["import_notes"] == ["normalised key Q1 → q1"]
