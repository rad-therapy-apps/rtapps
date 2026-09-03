"""Validates JSON activity documents and writes/updates their working copies in the database.

What this file does: Pydantic models (QuizImport, FlashcardsImport, MatchingImport,
SequencingImport) define the schemas for JSON files fed to the activity importers — one
subject plus one activity payload (quiz/flashcards/matching/sequencing). The import functions
create or update activity rows by slug, upsert outcomes for tagged questions, and publish
by default. `import_any` is a type-sniffing dispatcher that routes by the document's second
top-level key, replacing the need for separate CLI entry points per activity type.

Used here and why: Pydantic v2 models with `field_validator`/`model_validator` validate
documents against closed schemas before touching the database (ADR-0003) — the same pattern
as `app.content.importer` for lessons, so imported content can't bypass validation. Outcomes
are upserted (created once by code, then reused across questions) so the same SLO vocabulary
stays consistent across all activities.

How it fits the project: these are the first non-lesson activity types to have JSON import
paths. Tasks 5/8/9 will test and call `import_any` directly; `tools/migrate-legacy` (Tasks 6-7)
will emit documents matching these schemas; `app.seed.py` can load them for test fixtures.

Works with:
  Depends on: `app.auth.models.User` (attributes a publish), `app.content.importer` modules,
    `app.content.models` (Subject, Activity, Question), `app.content.activity_models` (Quiz,
    Flashcard, Matching, Sequencing, Outcome, tags), `app.content.service.publish_activity`.
  Used by: CLI in `app.content.importer._run` via `import_any` dispatcher; `app.seed.py`;
    Tasks 5/8/9 tests; future authoring UI.
"""

import uuid
from typing import Annotated, Any

from pydantic import BaseModel, Field, StringConstraints, model_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.content.activity_models import (
    FlashcardDeck,
    MatchingActivity,
    Outcome,
    QuestionOutcome,
    Quiz,
    QuizQuestion,
    SequencingActivity,
)
from app.content.importer import SubjectImport, _upsert_subject
from app.content.models import Activity, Question
from app.content.service import publish_activity


def text_doc(text: str) -> dict[str, Any]:
    """Wrap converter-emitted plain text in a one-paragraph closed-schema prose doc."""
    return {
        "type": "doc",
        "content": [{"type": "paragraph", "content": [{"type": "text", "text": text}]}],
    }


# ===== Pydantic Models =====


class QuizQuestionData(BaseModel):
    """A single question in a quiz: stem (text) plus multiple choice options."""

    stem: str = Field(min_length=1)
    options: list[str] = Field(min_length=2, max_length=10)
    answer: int
    explanation: str | None = None
    # Outcome codes must match ^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$ per SLO consistency requirement
    outcomes: list[
        Annotated[str, StringConstraints(pattern=r"^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$")]
    ] = Field(default_factory=list)

    @model_validator(mode="after")
    def _answer_in_range(self) -> "QuizQuestionData":
        """Reject an `answer` index that doesn't point at one of `options`."""
        if not 0 <= self.answer < len(self.options):
            raise ValueError(f"answer {self.answer} out of range for {len(self.options)} options")
        return self


class QuizPayload(BaseModel):
    """The quiz content: slug, title, grading config, and ordered questions."""

    slug: str = Field(pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$", max_length=120)
    title: str = Field(min_length=1, max_length=200)
    pass_percent: int = Field(default=80, ge=0, le=100)
    shuffle: bool = Field(default=True)
    questions: list[QuizQuestionData] = Field(min_length=1)


class QuizImport(BaseModel):
    """Top-level quiz import document: one subject plus one quiz."""

    subject: SubjectImport
    quiz: QuizPayload
    # Converter notes travelling with a migrated document; surfaced as the authoring
    # UI's needs-review queue via activity.config["import_notes"] (plan 3b).
    import_notes: list[str] = Field(default_factory=list)


class FlashcardCard(BaseModel):
    """A single flashcard: term and definition."""

    term: str = Field(min_length=1)
    definition: str = Field(min_length=1)


class FlashcardsPayload(BaseModel):
    """The flashcards content: slug, title, and card deck."""

    slug: str = Field(pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$", max_length=120)
    title: str = Field(min_length=1, max_length=200)
    cards: list[FlashcardCard] = Field(min_length=1)


class FlashcardsImport(BaseModel):
    """Top-level flashcards import document: one subject plus one deck."""

    subject: SubjectImport
    flashcards: FlashcardsPayload
    # Converter notes travelling with a migrated document; surfaced as the authoring
    # UI's needs-review queue via activity.config["import_notes"] (plan 3b).
    import_notes: list[str] = Field(default_factory=list)


class MatchingPair(BaseModel):
    """A single term-definition pair in a matching activity."""

    term: str = Field(min_length=1)
    definition: str = Field(min_length=1)


class MatchingPayload(BaseModel):
    """The matching activity content: slug, title, and term/definition pairs."""

    slug: str = Field(pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$", max_length=120)
    title: str = Field(min_length=1, max_length=200)
    pairs: list[MatchingPair] = Field(min_length=2)
    pass_percent: int = Field(default=80, ge=0, le=100)
    present_n: int | None = None

    @model_validator(mode="after")
    def _no_duplicate_definitions(self) -> "MatchingPayload":
        """Reject duplicate definitions in the pair list."""
        seen_defs = set()
        for pair in self.pairs:
            if pair.definition in seen_defs:
                raise ValueError(f"duplicate definition {pair.definition}")
            seen_defs.add(pair.definition)
        return self

    @model_validator(mode="after")
    def _no_duplicate_terms(self) -> "MatchingPayload":
        """Reject duplicate terms in the pair list."""
        seen_terms = set()
        for pair in self.pairs:
            if pair.term in seen_terms:
                raise ValueError(f"duplicate term {pair.term}")
            seen_terms.add(pair.term)
        return self


class MatchingImport(BaseModel):
    """Top-level matching import document: one subject plus one matching activity."""

    subject: SubjectImport
    matching: MatchingPayload
    # Converter notes travelling with a migrated document; surfaced as the authoring
    # UI's needs-review queue via activity.config["import_notes"] (plan 3b).
    import_notes: list[str] = Field(default_factory=list)


class SequencingItem(BaseModel):
    """A single item in a sequencing activity."""

    label: str = Field(min_length=1)
    detail: str | None = None


class SequencingPayload(BaseModel):
    """The sequencing activity content: slug, title, and items in correct order."""

    slug: str = Field(pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$", max_length=120)
    title: str = Field(min_length=1, max_length=200)
    items: list[SequencingItem] = Field(min_length=2)
    pass_percent: int = Field(default=80, ge=0, le=100)


class SequencingImport(BaseModel):
    """Top-level sequencing import document: one subject plus one sequencing activity."""

    subject: SubjectImport
    sequencing: SequencingPayload
    # Converter notes travelling with a migrated document; surfaced as the authoring
    # UI's needs-review queue via activity.config["import_notes"] (plan 3b).
    import_notes: list[str] = Field(default_factory=list)


# ===== Database Operations =====


async def _upsert_outcome(db: AsyncSession, code: str) -> Outcome:
    """Reuse an existing outcome by code, or create it on first import."""
    outcome = await db.scalar(select(Outcome).where(Outcome.code == code))
    if outcome is None:
        outcome = Outcome(code=code, title=code)  # title = code until an admin edits it (3b)
        db.add(outcome)
        await db.flush()
    return outcome


async def _upsert_activity(
    db: AsyncSession,
    *,
    kind: str,
    ref_id: uuid.UUID,
    title: str,
    subject_id: uuid.UUID,
    config: dict[str, Any],
    import_notes: list[str] | None = None,
) -> Activity:
    """Create a new activity or update an existing one by kind + ref_id."""
    config = dict(config)
    if import_notes:
        config["import_notes"] = import_notes
    else:
        config.pop("import_notes", None)
    activity = await db.scalar(
        select(Activity).where(Activity.kind == kind, Activity.ref_id == ref_id)
    )
    if activity is None:
        activity = Activity(
            kind=kind, ref_id=ref_id, title=title, subject_id=subject_id, config=config
        )
        db.add(activity)
    else:
        activity.title, activity.subject_id, activity.config = title, subject_id, config
    await db.flush()
    return activity


async def import_quiz(db: AsyncSession, doc: QuizImport, *, author: User | None = None) -> Activity:
    """Import or update a quiz activity with question bank and outcome tagging."""
    # Upsert the subject by slug.
    subject = await _upsert_subject(db, doc.subject)
    # Upsert the quiz by slug.
    quiz = await db.scalar(select(Quiz).where(Quiz.slug == doc.quiz.slug))
    if quiz is None:
        quiz = Quiz(slug=doc.quiz.slug, title=doc.quiz.title)
        db.add(quiz)
        await db.flush()
    else:
        quiz.title = doc.quiz.title
        # Reimport replaces the question set: deleting the Question rows cascades away
        # both quiz_question and question_outcome rows (both FKs are ON DELETE CASCADE).
        old_ids = [qq.question_id for qq in quiz.questions]
        quiz.questions.clear()
        await db.flush()
        for qid in old_ids:
            q = await db.get(Question, qid)
            if q is not None:
                await db.delete(q)
        await db.flush()
    # Build the ordered question set with outcome tags.
    for pos, item in enumerate(doc.quiz.questions, start=1):
        q = Question(
            type="single_choice",
            stem=text_doc(item.stem),
            body={"options": item.options, "answer": item.answer},
            explanation=text_doc(item.explanation) if item.explanation else None,
        )
        db.add(q)
        await db.flush()
        qq = QuizQuestion(quiz_id=quiz.id, question_id=q.id, position=pos)
        db.add(qq)
        # Tag the question with outcomes.
        for code in item.outcomes:
            outcome = await _upsert_outcome(db, code)
            db.add(QuestionOutcome(question_id=q.id, outcome_id=outcome.id))
    await db.flush()
    # Upsert the activity and publish.
    activity = await _upsert_activity(
        db,
        kind="quiz",
        ref_id=quiz.id,
        title=quiz.title,
        subject_id=subject.id,
        config={"pass_percent": doc.quiz.pass_percent, "shuffle": doc.quiz.shuffle},
        import_notes=doc.import_notes,
    )
    await publish_activity(db, activity, author, change_note="import")
    return activity


async def import_flashcards(
    db: AsyncSession, doc: FlashcardsImport, *, author: User | None = None
) -> Activity:
    """Import or update a flashcard deck activity."""
    # Upsert the subject by slug.
    subject = await _upsert_subject(db, doc.subject)
    # Upsert the flashcard deck by slug; replace cards wholesale on reimport.
    deck = await db.scalar(select(FlashcardDeck).where(FlashcardDeck.slug == doc.flashcards.slug))
    if deck is None:
        deck = FlashcardDeck(
            slug=doc.flashcards.slug,
            title=doc.flashcards.title,
            cards=[c.model_dump() for c in doc.flashcards.cards],
        )
        db.add(deck)
    else:
        deck.title = doc.flashcards.title
        deck.cards = [c.model_dump() for c in doc.flashcards.cards]
    await db.flush()
    # Upsert the activity and publish.
    activity = await _upsert_activity(
        db,
        kind="flashcards",
        ref_id=deck.id,
        title=deck.title,
        subject_id=subject.id,
        config={},
        import_notes=doc.import_notes,
    )
    await publish_activity(db, activity, author, change_note="import")
    return activity


async def import_matching(
    db: AsyncSession, doc: MatchingImport, *, author: User | None = None
) -> Activity:
    """Import or update a matching activity."""
    # Upsert the subject by slug.
    subject = await _upsert_subject(db, doc.subject)
    # Upsert the matching activity by slug; replace pairs wholesale on reimport.
    matching = await db.scalar(
        select(MatchingActivity).where(MatchingActivity.slug == doc.matching.slug)
    )
    if matching is None:
        matching = MatchingActivity(
            slug=doc.matching.slug,
            title=doc.matching.title,
            pairs=[p.model_dump() for p in doc.matching.pairs],
        )
        db.add(matching)
    else:
        matching.title = doc.matching.title
        matching.pairs = [p.model_dump() for p in doc.matching.pairs]
    await db.flush()
    # Upsert the activity and publish.
    config: dict[str, Any] = {"pass_percent": doc.matching.pass_percent}
    if doc.matching.present_n is not None:
        config["present_n"] = doc.matching.present_n
    activity = await _upsert_activity(
        db,
        kind="matching",
        ref_id=matching.id,
        title=matching.title,
        subject_id=subject.id,
        config=config,
        import_notes=doc.import_notes,
    )
    await publish_activity(db, activity, author, change_note="import")
    return activity


async def import_sequencing(
    db: AsyncSession, doc: SequencingImport, *, author: User | None = None
) -> Activity:
    """Import or update a sequencing activity."""
    # Upsert the subject by slug.
    subject = await _upsert_subject(db, doc.subject)
    # Upsert the sequencing activity by slug; replace items wholesale on reimport.
    sequencing = await db.scalar(
        select(SequencingActivity).where(SequencingActivity.slug == doc.sequencing.slug)
    )
    if sequencing is None:
        sequencing = SequencingActivity(
            slug=doc.sequencing.slug,
            title=doc.sequencing.title,
            items=[i.model_dump() for i in doc.sequencing.items],
        )
        db.add(sequencing)
    else:
        sequencing.title = doc.sequencing.title
        sequencing.items = [i.model_dump() for i in doc.sequencing.items]
    await db.flush()
    # Upsert the activity and publish.
    activity = await _upsert_activity(
        db,
        kind="sequencing",
        ref_id=sequencing.id,
        title=sequencing.title,
        subject_id=subject.id,
        config={"pass_percent": doc.sequencing.pass_percent},
        import_notes=doc.import_notes,
    )
    await publish_activity(db, activity, author, change_note="import")
    return activity


# ===== Dispatcher =====

_IMPORTERS: dict[str, tuple[type[BaseModel], Any]] = {
    "quiz": (QuizImport, import_quiz),
    "flashcards": (FlashcardsImport, import_flashcards),
    "matching": (MatchingImport, import_matching),
    "sequencing": (SequencingImport, import_sequencing),
}


async def import_any(
    db: AsyncSession, data: dict[str, Any], *, author: User | None = None
) -> Activity:
    """Validate + dispatch an import document by its payload key; returns the published Activity."""
    # Check for exactly one activity type key in the document.
    valid_keys = set(_IMPORTERS.keys()) | {"lesson"}
    kinds = [k for k in valid_keys if k in data]
    if len(kinds) != 1:
        raise ValueError(f"import document must contain exactly one of {sorted(valid_keys)}")
    kind = kinds[0]
    if kind == "lesson":
        # Import via the lesson importer (not here).
        from app.content.importer import LessonImport, import_lesson

        doc = LessonImport.model_validate(data)
        result = await import_lesson(db, doc, author=author)
        lesson_activity = await db.scalar(select(Activity).where(Activity.lesson_id == result.id))
        assert lesson_activity is not None
        return lesson_activity
    # All other activity types are in _IMPORTERS.
    model, fn = _IMPORTERS[kind]
    doc = model.model_validate(data)  # type: ignore[assignment]
    activity = await fn(db, doc, author=author)
    return activity  # type: ignore[no-any-return]
