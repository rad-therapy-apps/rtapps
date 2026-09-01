"""What this file tests: `app/content/activity_importer.py` — the activity Pydantic schemas
(QuizImport, FlashcardsImport, MatchingImport, SequencingImport) with their validation rules,
`import_any` dispatcher that routes by document key, and the individual import functions
(import_quiz, import_flashcards, import_matching, import_sequencing) that create/update rows
and tag questions with outcomes.

Used here and why: a real `db` session for async import paths; plain synchronous calls to
model_validate for pydantic-only validation tests (duplicate checking, range validation, etc.)
that don't require database access.

How it fits the project: activity imports follow the same closed-schema pattern as lesson
imports (ADR-0003) — JSON is validated before touching the database. These are the first
activity types with their own importers (lessons are imported via `importer.py`); Tasks 5/8/9
test and seed.py will call `import_any` directly.

Works with: pytest-asyncio, sqlalchemy asyncio.
Depends on: `db` fixture from `conftest.py`; `app.content.activity_importer`,
`app.content.activity_models`, `app.content.models`.
Used by: CI `api` job; `make test-api`.
"""

from typing import Any

import pytest
from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.content.activity_importer import MatchingImport, QuizImport, import_any
from app.content.activity_models import Outcome, Question, QuestionOutcome, Quiz, QuizQuestion
from app.content.models import ContentVersion

SUBJECT = {"slug": "radiation-biology", "title": "Radiation Biology", "order": 1}
QUIZ_DOC: dict[str, Any] = {
    "subject": SUBJECT,
    "quiz": {
        "slug": "ars-quiz",
        "title": "ARS Quiz",
        "pass_percent": 80,
        "shuffle": True,
        "questions": [
            {
                "stem": "Q1?",
                "options": ["A", "B", "C"],
                "answer": 0,
                "explanation": "Because.",
                "outcomes": ["RB-1"],
            },
            {
                "stem": "Q2?",
                "options": ["A", "B"],
                "answer": 1,
                "explanation": None,
                "outcomes": ["RB-1", "RB-2"],
            },
        ],
    },
}


async def test_quiz_import_publishes_and_tags(db: AsyncSession) -> None:
    activity = await import_any(db, QUIZ_DOC)
    assert activity.kind == "quiz" and activity.status == "published"
    assert activity.config == {"pass_percent": 80, "shuffle": True}
    version = await db.get(ContentVersion, activity.current_version_id)
    assert len(version.snapshot["quiz"]["questions"]) == 2
    assert await db.scalar(select(func.count()).select_from(Outcome)) == 2  # RB-1, RB-2
    assert await db.scalar(select(func.count()).select_from(QuestionOutcome)) == 3


async def test_quiz_reimport_updates_not_duplicates(db: AsyncSession) -> None:
    a1 = await import_any(db, QUIZ_DOC)
    doc2 = {
        **QUIZ_DOC,
        "quiz": {
            **QUIZ_DOC["quiz"],
            "title": "ARS Quiz v2",
            "questions": QUIZ_DOC["quiz"]["questions"][:1],
        },
    }
    a2 = await import_any(db, doc2)
    assert a2.id == a1.id and a2.title == "ARS Quiz v2"
    # AT-14: re-run updates in place — one quiz, one question row set, next version number.
    assert await db.scalar(select(func.count()).select_from(Quiz)) == 1
    assert await db.scalar(select(func.count()).select_from(QuizQuestion)) == 1
    assert await db.scalar(select(func.count()).select_from(Question)) == 1
    v = await db.get(ContentVersion, a2.current_version_id)
    assert v.version == 2


async def test_matching_flashcards_sequencing_import(db: AsyncSession) -> None:
    for doc, kind in (
        (
            {
                "subject": SUBJECT,
                "matching": {
                    "slug": "m1",
                    "title": "M",
                    "pairs": [
                        {"term": "T1", "definition": "D1"},
                        {"term": "T2", "definition": "D2"},
                    ],
                },
            },
            "matching",
        ),
        (
            {
                "subject": SUBJECT,
                "flashcards": {
                    "slug": "f1",
                    "title": "F",
                    "cards": [{"term": "T", "definition": "D"}],
                },
            },
            "flashcards",
        ),
        (
            {
                "subject": SUBJECT,
                "sequencing": {
                    "slug": "s1",
                    "title": "S",
                    "items": [{"label": "One"}, {"label": "Two"}],
                },
            },
            "sequencing",
        ),
    ):
        activity = await import_any(db, doc)
        assert activity.kind == kind and activity.status == "published"
        assert activity.access == "practice"


def test_matching_rejects_duplicate_definitions() -> None:
    with pytest.raises(ValidationError):
        MatchingImport.model_validate(
            {
                "subject": SUBJECT,
                "matching": {
                    "slug": "m2",
                    "title": "M",
                    "pairs": [
                        {"term": "T1", "definition": "same"},
                        {"term": "T2", "definition": "same"},
                    ],
                },
            }
        )


def test_quiz_rejects_answer_out_of_range() -> None:
    bad = {
        "subject": SUBJECT,
        "quiz": {
            "slug": "b",
            "title": "B",
            "questions": [{"stem": "Q?", "options": ["A", "B"], "answer": 5}],
        },
    }
    with pytest.raises(ValidationError):
        QuizImport.model_validate(bad)


async def test_import_any_rejects_unknown_document(db: AsyncSession) -> None:
    with pytest.raises(ValueError):
        await import_any(db, {"subject": SUBJECT, "mystery": {}})
