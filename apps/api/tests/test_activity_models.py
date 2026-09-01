"""What this file tests: the SQLAlchemy models for Quiz, FlashcardDeck, MatchingActivity,
SequencingActivity, Outcome, QuestionOutcome, and the Program table; also ACTIVITY_KINDS
and ACTIVITY_ACCESS vocabularies and Activity.access column.

Used here and why: these classes/tuples are shared by later test files (Tasks 2-10), so
keeping helper functions (`text_doc`, `make_subject`, `make_quiz`) here lets us avoid
duplication. `test_activity_models.py` is reused for round-trip tests of each model type.

How it fits the project: plan 3a (FR-E-05/06, FR-S-07/08). These models are produced by
Task 1 and consumed by Tasks 2-10 for building snapshots, routers, and educator tooling.

Works with:
  Depends on: `app.content.activity_models`, `app.content.models`, `app.cohorts.models`,
    `app.auth.models.TimestampMixin`, `app.db.Base`, `app.ids.new_id`.
  Used by: later test modules that import helpers like `make_subject` and `make_quiz`.
"""

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.cohorts.models import Cohort, Program
from app.content.activity_models import (
    FlashcardDeck,
    MatchingActivity,
    Outcome,
    QuestionOutcome,
    Quiz,
    QuizQuestion,
    SequencingActivity,
)
from app.content.models import ACTIVITY_ACCESS, ACTIVITY_KINDS, Activity, Question, Subject


def text_doc(text: str) -> dict[str, Any]:
    """One-paragraph ProseMirror doc wrapping plain text (matches the importer's helper)."""
    return {
        "type": "doc",
        "content": [{"type": "paragraph", "content": [{"type": "text", "text": text}]}],
    }


async def make_subject(db: AsyncSession, slug: str = "radiation-biology") -> Subject:
    subject = Subject(slug=slug, title="Radiation Biology", order=1)
    db.add(subject)
    await db.flush()
    return subject


async def make_quiz(
    db: AsyncSession, subject: Subject, slug: str = "ars-quiz"
) -> tuple[Quiz, Activity]:
    """A two-question quiz with its practice activity (unpublished)."""
    quiz = Quiz(slug=slug, title="ARS Quiz")
    db.add(quiz)
    await db.flush()
    for pos, answer in ((1, 0), (2, 1)):
        q = Question(
            type="single_choice",
            stem=text_doc(f"Question {pos}?"),
            body={"options": ["A", "B", "C"], "answer": answer},
            explanation=text_doc(f"Because {pos}."),
        )
        db.add(q)
        await db.flush()
        db.add(QuizQuestion(quiz_id=quiz.id, question_id=q.id, position=pos))
    activity = Activity(
        kind="quiz",
        ref_id=quiz.id,
        title=quiz.title,
        subject_id=subject.id,
        config={"pass_percent": 80, "shuffle": True},
    )
    db.add(activity)
    await db.flush()
    return quiz, activity


async def test_kind_and_access_vocabulary() -> None:
    assert ACTIVITY_KINDS == ("lesson", "quiz", "flashcards", "matching", "sequencing")
    assert ACTIVITY_ACCESS == ("practice", "assessment")


async def test_quiz_round_trip(db: AsyncSession) -> None:
    subject = await make_subject(db)
    quiz, activity = await make_quiz(db, subject)
    await db.refresh(quiz)
    loaded = await db.get(Quiz, quiz.id)
    assert loaded is not None
    assert [qq.position for qq in loaded.questions] == [1, 2]
    assert loaded.questions[0].question.body["answer"] == 0
    assert activity.access == "practice"  # default


async def test_payload_types_round_trip(db: AsyncSession) -> None:
    deck = FlashcardDeck(
        slug="ars-cards",
        title="ARS Cards",
        cards=[{"term": "ARS", "definition": "Acute radiation syndrome"}],
    )
    matching = MatchingActivity(
        slug="ars-match",
        title="ARS Match",
        pairs=[
            {"term": "Atrophy", "definition": "Shrinkage"},
            {"term": "Epilation", "definition": "Hair loss"},
        ],
    )
    seq = SequencingActivity(
        slug="ars-order",
        title="ARS Stages",
        items=[{"label": "Prodromal"}, {"label": "Latent"}, {"label": "Manifest"}],
    )
    db.add_all([deck, matching, seq])
    await db.flush()
    deck_result = await db.get(FlashcardDeck, deck.id)
    assert deck_result is not None
    assert deck_result.cards[0]["term"] == "ARS"
    matching_result = await db.get(MatchingActivity, matching.id)
    assert matching_result is not None
    assert len(matching_result.pairs) == 2
    seq_result = await db.get(SequencingActivity, seq.id)
    assert seq_result is not None
    assert next(i["label"] for i in seq_result.items) == "Prodromal"


async def test_outcome_tagging(db: AsyncSession) -> None:
    subject = await make_subject(db)
    quiz, _ = await make_quiz(db, subject)
    outcome = Outcome(code="RB-1", title="Describe ARS stages")
    db.add(outcome)
    await db.flush()
    # Get the first quiz question
    first_qq = await db.scalar(
        select(QuizQuestion).where(QuizQuestion.quiz_id == quiz.id).order_by(QuizQuestion.position)
    )
    assert first_qq is not None
    db.add(QuestionOutcome(question_id=first_qq.question_id, outcome_id=outcome.id))
    await db.flush()
    linked = await db.scalar(
        select(QuestionOutcome).where(QuestionOutcome.outcome_id == outcome.id)
    )
    assert linked is not None


async def test_program_fk_on_cohort(db: AsyncSession) -> None:
    program = Program(name="RT Program")
    db.add(program)
    await db.flush()
    cohort = Cohort(name="Fall", join_code="AAAAAA", program_id=program.id)
    db.add(cohort)
    await db.flush()
    cohort_result = await db.get(Cohort, cohort.id)
    assert cohort_result is not None
    assert cohort_result.program_id == program.id
