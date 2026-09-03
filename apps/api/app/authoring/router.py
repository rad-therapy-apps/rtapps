"""Authoring API for lesson working copies, the question bank, the quiz/flashcard-deck/
matching/sequencing activity builders, data tables, and calculator activities.

What this file does: `GET /subjects` and `GET /subjects/{slug}/activities` let an author
browse what exists (any status, not just published); `POST /lessons` creates a draft lesson
+ paired draft activity; `GET/PUT /lessons/{id}` read/edit its meta; `PUT
/lessons/{id}/pages` replaces its whole page tree (Task 8). `GET/POST/PUT
/questions[...]` is the flattened question bank; `POST/GET/PUT` under `/quizzes`,
`/flashcard-decks`, `/matching`, `/sequencing` each create a working-copy row (Quiz/
FlashcardDeck/MatchingActivity/SequencingActivity) plus its paired draft `Activity`, and
read/replace that row's content by *activity* id (Task 9). `GET/PUT` under `/data-tables`
manage the shared, keyed `DataTable` lookup rows an author edits directly (no paired
`Activity` — a table isn't itself attemptable); `POST/GET/PUT` under `/calculators` create
and edit calculator activities, whose `Activity.config` (`calc_type` + the `data_tables`
keys it references) *is* the working copy, with no row of its own (Task 11). Every route
here edits the *working copy* only — publishing (Task 10) is a separate step, so an author
can save an in-progress edit to a published activity without it reaching students until
they explicitly publish.

Used here and why: `build_snapshot` (the same function `publish_lesson` freezes into a
`content_version`) is reused verbatim for lesson `GET`s — it already returns the
unstripped tree (answers included), which is exactly the author view and exactly what
Task 15's editor needs; `app.content.importer.replace_lesson_pages` (extracted from
`import_lesson` in this task) is reused verbatim for `PUT .../pages` so the importer and
the authoring UI can never drift apart on how a page tree is written. Slug uniqueness is
enforced by pre-check SELECT (the common-case fast path, no exception handling) with the
database's unique constraint kept as an `IntegrityError` backstop for the race window
between check and write — the same pattern `app.cohorts.router` uses for join codes; the
four builders reuse this exact pre-check/backstop pattern via `_check_slug_free`. Quiz's
`PUT` reuses `activity_importer.import_quiz`'s reimport idiom verbatim
(`quiz.questions.clear()`, flush, re-add positioned rows) so the `uq_quiz_question_position`
constraint is always satisfied by construction. `text_doc()` (also from
`activity_importer`) wraps a question bank entry's plain-text stem/explanation into the
same one-paragraph ProseMirror doc the importer writes; `_doc_text` here is its inverse for
responses (kept local rather than importing `activity_snapshots._plain_text`, which is
module-private to that layer).

How it fits the project: plan 3b Task 8 (lessons), Task 9 (question bank + builders), and
Task 11 (data tables + calculator) — Task 9's builders and Task 11's calculator are what
Task 16's builder pages consume. `POST .../publish` (Task 10) freezes the current working
copy into the next immutable `ContentVersion` and points students at it — a lesson's own
`current_version_id` is kept in sync via `publish_lesson`, every other kind via
`publish_activity` directly; a `ValueError` from that (a calculator referencing a
`data_tables` key with no `DataTable` row) becomes a 422, not a 500. `GET .../preview`
returns the exact stripped snapshot students will see the moment that publish happens;
`GET .../versions` lists the publish history newest-first.
`dependencies=[Depends(require_author)]` at router level (not per-route) means no route
here can be added later without the educator/admin gate.

Depends on: `app.audit.service.record_audit`, `app.authoring.deps.require_author`,
`app.authoring.schemas` (all request/response models), `app.auth.models.User`,
`app.content.activity_importer` (`text_doc`), `app.content.activity_models`
(Quiz/QuizQuestion/FlashcardDeck/MatchingActivity/SequencingActivity/DataTable),
`app.content.activity_snapshots` (`build_activity_snapshot`, `strip_activity_answers`),
`app.content.importer` (`ProseValidationError`, `replace_lesson_pages`), `app.content.models`
(ACTIVITY_ACCESS unused directly here but re-exported via schemas, Activity, ContentVersion,
Lesson, Question, Subject), `app.content.service` (`publish_activity`, `publish_lesson`),
`app.content.snapshot.build_snapshot`, `app.db.get_session`, `app.errors.Problem`,
`app.ids.new_id` (a calculator's `Activity.ref_id`, which points at nothing).
Used by: `app.main` (mounted); `tests/test_authoring_lessons.py`,
`tests/test_authoring_builders.py`, `tests/test_authoring_publish.py`,
`tests/test_data_tables.py`, `tests/test_calculator_activity.py`.
"""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy import Text, cast, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import record_audit
from app.auth.models import User
from app.authoring.deps import require_author
from app.authoring.schemas import (
    ActivityAuthorRow,
    CalculatorAuthorOut,
    CalculatorCreateIn,
    CalculatorPutIn,
    DataTableOut,
    DataTablePutIn,
    FlashcardDeckAuthorOut,
    FlashcardDeckCreateIn,
    FlashcardDeckPutIn,
    LessonAuthorOut,
    LessonCreateIn,
    LessonMetaIn,
    MatchingAuthorOut,
    MatchingCreateIn,
    MatchingPutIn,
    PagesIn,
    PublishIn,
    QuestionAuthorIn,
    QuestionAuthorOut,
    QuizAuthorOut,
    QuizCreateIn,
    QuizPutIn,
    SequencingAuthorOut,
    SequencingCreateIn,
    SequencingPutIn,
    SubjectAuthorOut,
    VersionOut,
)
from app.content.activity_importer import FlashcardCard, MatchingPair, SequencingItem, text_doc
from app.content.activity_models import (
    DataTable,
    FlashcardDeck,
    MatchingActivity,
    Quiz,
    QuizQuestion,
    SequencingActivity,
)
from app.content.activity_snapshots import build_activity_snapshot, strip_activity_answers
from app.content.importer import replace_lesson_pages
from app.content.models import Activity, ContentVersion, Lesson, Question, Subject
from app.content.prose import ProseValidationError
from app.content.service import publish_activity, publish_lesson
from app.content.snapshot import build_snapshot
from app.db import get_session
from app.errors import Problem
from app.ids import new_id

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
        lesson = await db.get(Lesson, activity.lesson_id)
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
    try:
        await db.flush()  # assigns lesson.id before activity creation below
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


# ---------------------------------------------------------------------------
# Shared helpers for the question bank + four activity builders (Task 9)
# ---------------------------------------------------------------------------


def _escape_like(q: str) -> str:
    # Escape backslash, percent, and underscore for ILIKE pattern matching.
    # This is duplicated from `app.admin.router._escape_like()` to avoid cross-router
    # imports; the admin router has the same pattern and maintains it independently.
    return q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _doc_text(doc: dict[str, Any]) -> str:
    """Concatenate a ProseMirror doc's text nodes back to plain text — the inverse of
    `activity_importer.text_doc()`."""
    out: list[str] = []

    def walk(node: dict[str, Any]) -> None:
        if node.get("type") == "text":
            out.append(str(node.get("text", "")))
        for child in node.get("content", []) or []:
            walk(child)

    walk(doc)
    return " ".join(" ".join(out).split())


def _question_out(question: Question) -> QuestionAuthorOut:
    """Flatten one bank `Question` row to the API's `{stem, options, answer, explanation}`."""
    return QuestionAuthorOut(
        id=question.id,
        stem=_doc_text(question.stem),
        options=question.body["options"],
        answer=question.body["answer"],
        explanation=_doc_text(question.explanation) if question.explanation else None,
    )


async def _subject_for_create(db: AsyncSession, subject_slug: str) -> Subject:
    """The subject a new builder row files under; 404 if the slug doesn't resolve."""
    subject = await db.scalar(select(Subject).where(Subject.slug == subject_slug))
    if subject is None:
        raise Problem(404, "Subject not found")
    return subject


async def _check_slug_free(db: AsyncSession, model: type[Any], slug: str, label: str) -> None:
    """Pre-check SELECT for a builder's working-copy slug — the fast path `create_lesson`
    also uses; the caller still needs the `IntegrityError` backstop for the race window."""
    if await db.scalar(select(model.id).where(model.slug == slug)) is not None:
        raise Problem(409, f"A {label} with that slug already exists")


async def _create_activity(
    db: AsyncSession,
    *,
    kind: str,
    ref_id: uuid.UUID,
    subject: Subject,
    title: str,
    access: str,
    config: dict[str, Any],
) -> Activity:
    """Create the paired draft `Activity` for a new builder working-copy row."""
    activity = Activity(
        kind=kind,
        ref_id=ref_id,
        title=title,
        subject_id=subject.id,
        access=access,
        config=config,
        status="draft",
    )
    db.add(activity)
    await db.flush()
    return activity


# ---------------------------------------------------------------------------
# Question bank (Task 9)
# ---------------------------------------------------------------------------


@router.get("/questions", response_model=list[QuestionAuthorOut])
async def list_questions(
    q: str | None = None, db: AsyncSession = Depends(get_session)
) -> list[QuestionAuthorOut]:
    """The question bank, optionally filtered by stem text (ILIKE over `stem` cast to text).

    No subject filter: `Question` carries no `subject_id` column of its own (it's shared
    bank material referenced from quizzes and lesson knowledge checks alike) — a deviation
    from a per-subject browse experience recorded in plan 3b's task-9 notes.
    """
    stmt = select(Question).order_by(Question.id).limit(50)
    if q:
        # Escape ILIKE wildcards so literal % and _ in the search match only themselves.
        escaped = _escape_like(q.strip())
        pattern = f"%{escaped}%"
        stmt = stmt.where(cast(Question.stem, Text).ilike(pattern, escape="\\"))
    questions = (await db.scalars(stmt)).all()
    return [_question_out(question) for question in questions]


@router.post("/questions", response_model=QuestionAuthorOut, status_code=status.HTTP_201_CREATED)
async def create_question(
    payload: QuestionAuthorIn, db: AsyncSession = Depends(get_session)
) -> QuestionAuthorOut:
    """Add a new bank question, independent of any quiz — attach it to one via
    `PUT /authoring/quizzes/{id}`'s `question_ids`."""
    question = Question(
        type="single_choice",
        stem=text_doc(payload.stem),
        body={"options": payload.options, "answer": payload.answer},
        explanation=text_doc(payload.explanation) if payload.explanation else None,
    )
    db.add(question)
    await db.commit()
    return _question_out(question)


@router.put("/questions/{question_id}", response_model=QuestionAuthorOut)
async def update_question(
    question_id: uuid.UUID, payload: QuestionAuthorIn, db: AsyncSession = Depends(get_session)
) -> QuestionAuthorOut:
    """Edit a bank question in place — any quiz referencing it sees the new content."""
    question = await db.get(Question, question_id)
    if question is None:
        raise Problem(404, "Question not found")
    question.stem = text_doc(payload.stem)
    question.body = {"options": payload.options, "answer": payload.answer}
    question.explanation = text_doc(payload.explanation) if payload.explanation else None
    await db.commit()
    return _question_out(question)


# ---------------------------------------------------------------------------
# Quiz builder (Task 9)
# ---------------------------------------------------------------------------


def _quiz_out(quiz: Quiz, activity: Activity, subject: Subject) -> QuizAuthorOut:
    return QuizAuthorOut(
        activity_id=activity.id,
        quiz_id=quiz.id,
        subject_slug=subject.slug,
        slug=quiz.slug,
        title=quiz.title,
        status=activity.status,
        access=activity.access,
        config=activity.config,
        questions=[_question_out(qq.question) for qq in quiz.questions],
    )


async def _resolve_quiz(db: AsyncSession, activity_id: uuid.UUID) -> tuple[Activity, Quiz, Subject]:
    """The activity/quiz/subject triple for one quiz activity id; 404 on a missing id or a
    kind mismatch (e.g. a lesson activity id used against `/authoring/quizzes/...`)."""
    activity = await db.get(Activity, activity_id)
    if activity is None or activity.kind != "quiz":
        raise Problem(404, "Quiz not found")
    quiz = await db.get(Quiz, activity.ref_id)
    assert quiz is not None  # ref_id always points at a live Quiz row once created
    subject = await db.get(Subject, activity.subject_id)
    assert subject is not None
    return activity, quiz, subject


@router.post("/quizzes", response_model=QuizAuthorOut, status_code=status.HTTP_201_CREATED)
async def create_quiz(
    payload: QuizCreateIn, db: AsyncSession = Depends(get_session)
) -> QuizAuthorOut:
    """Create an empty draft quiz + its paired draft activity; add questions via the `PUT`."""
    subject = await _subject_for_create(db, payload.subject_slug)
    await _check_slug_free(db, Quiz, payload.slug, "quiz")
    quiz = Quiz(slug=payload.slug, title=payload.title)
    db.add(quiz)
    try:
        await db.flush()  # assigns quiz.id before the activity below points ref_id at it
        activity = await _create_activity(
            db,
            kind="quiz",
            ref_id=quiz.id,
            subject=subject,
            title=quiz.title,
            access=payload.access,
            config=payload.config,
        )
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise Problem(409, "A quiz with that slug already exists") from exc
    # Same reasoning as `create_lesson`'s `db.refresh(lesson, ["pages"])`: `quiz` was built
    # via the constructor + flush, never a SELECT, so `questions` (lazy="selectin") was
    # never eager-loaded; it's empty either way for a brand-new quiz.
    await db.refresh(quiz, ["questions"])
    return _quiz_out(quiz, activity, subject)


@router.get("/quizzes/{activity_id}", response_model=QuizAuthorOut)
async def get_quiz(
    activity_id: uuid.UUID, db: AsyncSession = Depends(get_session)
) -> QuizAuthorOut:
    activity, quiz, subject = await _resolve_quiz(db, activity_id)
    return _quiz_out(quiz, activity, subject)


@router.put("/quizzes/{activity_id}", response_model=QuizAuthorOut)
async def update_quiz(
    activity_id: uuid.UUID, payload: QuizPutIn, db: AsyncSession = Depends(get_session)
) -> QuizAuthorOut:
    """Replace the quiz's question set wholesale, rewriting positions 1..n in list order."""
    activity, quiz, subject = await _resolve_quiz(db, activity_id)
    questions = []
    for question_id in payload.question_ids:
        question = await db.get(Question, question_id)
        if question is None:
            raise Problem(422, f"Unknown question id {question_id}")
        questions.append(question)
    # Same reimport idiom as `activity_importer.import_quiz`: clear then flush so the
    # `uq_quiz_question_position` constraint never sees a stale + new row collide.
    quiz.questions.clear()
    await db.flush()
    for position, question in enumerate(questions, start=1):
        db.add(QuizQuestion(quiz_id=quiz.id, question_id=question.id, position=position))
    quiz.title = payload.title
    activity.title, activity.access, activity.config = payload.title, payload.access, payload.config
    await db.commit()
    await db.refresh(quiz, ["questions"])
    return _quiz_out(quiz, activity, subject)


# ---------------------------------------------------------------------------
# Flashcard deck builder (Task 9)
# ---------------------------------------------------------------------------


def _flashcard_out(
    deck: FlashcardDeck, activity: Activity, subject: Subject
) -> FlashcardDeckAuthorOut:
    return FlashcardDeckAuthorOut(
        activity_id=activity.id,
        deck_id=deck.id,
        subject_slug=subject.slug,
        slug=deck.slug,
        title=deck.title,
        status=activity.status,
        access=activity.access,
        config=activity.config,
        cards=[FlashcardCard(**c) for c in deck.cards],
    )


async def _resolve_flashcard_deck(
    db: AsyncSession, activity_id: uuid.UUID
) -> tuple[Activity, FlashcardDeck, Subject]:
    activity = await db.get(Activity, activity_id)
    if activity is None or activity.kind != "flashcards":
        raise Problem(404, "Flashcard deck not found")
    deck = await db.get(FlashcardDeck, activity.ref_id)
    assert deck is not None
    subject = await db.get(Subject, activity.subject_id)
    assert subject is not None
    return activity, deck, subject


@router.post(
    "/flashcard-decks", response_model=FlashcardDeckAuthorOut, status_code=status.HTTP_201_CREATED
)
async def create_flashcard_deck(
    payload: FlashcardDeckCreateIn, db: AsyncSession = Depends(get_session)
) -> FlashcardDeckAuthorOut:
    subject = await _subject_for_create(db, payload.subject_slug)
    await _check_slug_free(db, FlashcardDeck, payload.slug, "flashcard deck")
    deck = FlashcardDeck(
        slug=payload.slug, title=payload.title, cards=[c.model_dump() for c in payload.cards]
    )
    db.add(deck)
    try:
        await db.flush()
        activity = await _create_activity(
            db,
            kind="flashcards",
            ref_id=deck.id,
            subject=subject,
            title=deck.title,
            access=payload.access,
            config=payload.config,
        )
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise Problem(409, "A flashcard deck with that slug already exists") from exc
    return _flashcard_out(deck, activity, subject)


@router.get("/flashcard-decks/{activity_id}", response_model=FlashcardDeckAuthorOut)
async def get_flashcard_deck(
    activity_id: uuid.UUID, db: AsyncSession = Depends(get_session)
) -> FlashcardDeckAuthorOut:
    activity, deck, subject = await _resolve_flashcard_deck(db, activity_id)
    return _flashcard_out(deck, activity, subject)


@router.put("/flashcard-decks/{activity_id}", response_model=FlashcardDeckAuthorOut)
async def update_flashcard_deck(
    activity_id: uuid.UUID, payload: FlashcardDeckPutIn, db: AsyncSession = Depends(get_session)
) -> FlashcardDeckAuthorOut:
    activity, deck, subject = await _resolve_flashcard_deck(db, activity_id)
    deck.title = payload.title
    deck.cards = [c.model_dump() for c in payload.cards]
    activity.title, activity.access, activity.config = payload.title, payload.access, payload.config
    await db.commit()
    return _flashcard_out(deck, activity, subject)


# ---------------------------------------------------------------------------
# Matching builder (Task 9)
# ---------------------------------------------------------------------------


def _matching_out(m: MatchingActivity, activity: Activity, subject: Subject) -> MatchingAuthorOut:
    return MatchingAuthorOut(
        activity_id=activity.id,
        matching_id=m.id,
        subject_slug=subject.slug,
        slug=m.slug,
        title=m.title,
        status=activity.status,
        access=activity.access,
        config=activity.config,
        pairs=[MatchingPair(**p) for p in m.pairs],
    )


async def _resolve_matching(
    db: AsyncSession, activity_id: uuid.UUID
) -> tuple[Activity, MatchingActivity, Subject]:
    activity = await db.get(Activity, activity_id)
    if activity is None or activity.kind != "matching":
        raise Problem(404, "Matching activity not found")
    matching = await db.get(MatchingActivity, activity.ref_id)
    assert matching is not None
    subject = await db.get(Subject, activity.subject_id)
    assert subject is not None
    return activity, matching, subject


@router.post("/matching", response_model=MatchingAuthorOut, status_code=status.HTTP_201_CREATED)
async def create_matching(
    payload: MatchingCreateIn, db: AsyncSession = Depends(get_session)
) -> MatchingAuthorOut:
    subject = await _subject_for_create(db, payload.subject_slug)
    await _check_slug_free(db, MatchingActivity, payload.slug, "matching activity")
    matching = MatchingActivity(
        slug=payload.slug, title=payload.title, pairs=[p.model_dump() for p in payload.pairs]
    )
    db.add(matching)
    try:
        await db.flush()
        activity = await _create_activity(
            db,
            kind="matching",
            ref_id=matching.id,
            subject=subject,
            title=matching.title,
            access=payload.access,
            config=payload.config,
        )
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise Problem(409, "A matching activity with that slug already exists") from exc
    return _matching_out(matching, activity, subject)


@router.get("/matching/{activity_id}", response_model=MatchingAuthorOut)
async def get_matching(
    activity_id: uuid.UUID, db: AsyncSession = Depends(get_session)
) -> MatchingAuthorOut:
    activity, matching, subject = await _resolve_matching(db, activity_id)
    return _matching_out(matching, activity, subject)


@router.put("/matching/{activity_id}", response_model=MatchingAuthorOut)
async def update_matching(
    activity_id: uuid.UUID, payload: MatchingPutIn, db: AsyncSession = Depends(get_session)
) -> MatchingAuthorOut:
    activity, matching, subject = await _resolve_matching(db, activity_id)
    matching.title = payload.title
    matching.pairs = [p.model_dump() for p in payload.pairs]
    activity.title, activity.access, activity.config = payload.title, payload.access, payload.config
    await db.commit()
    return _matching_out(matching, activity, subject)


# ---------------------------------------------------------------------------
# Sequencing builder (Task 9)
# ---------------------------------------------------------------------------


def _sequencing_out(
    s: SequencingActivity, activity: Activity, subject: Subject
) -> SequencingAuthorOut:
    return SequencingAuthorOut(
        activity_id=activity.id,
        sequencing_id=s.id,
        subject_slug=subject.slug,
        slug=s.slug,
        title=s.title,
        status=activity.status,
        access=activity.access,
        config=activity.config,
        items=[SequencingItem(**i) for i in s.items],
    )


async def _resolve_sequencing(
    db: AsyncSession, activity_id: uuid.UUID
) -> tuple[Activity, SequencingActivity, Subject]:
    activity = await db.get(Activity, activity_id)
    if activity is None or activity.kind != "sequencing":
        raise Problem(404, "Sequencing activity not found")
    sequencing = await db.get(SequencingActivity, activity.ref_id)
    assert sequencing is not None
    subject = await db.get(Subject, activity.subject_id)
    assert subject is not None
    return activity, sequencing, subject


@router.post("/sequencing", response_model=SequencingAuthorOut, status_code=status.HTTP_201_CREATED)
async def create_sequencing(
    payload: SequencingCreateIn, db: AsyncSession = Depends(get_session)
) -> SequencingAuthorOut:
    subject = await _subject_for_create(db, payload.subject_slug)
    await _check_slug_free(db, SequencingActivity, payload.slug, "sequencing activity")
    sequencing = SequencingActivity(
        slug=payload.slug, title=payload.title, items=[i.model_dump() for i in payload.items]
    )
    db.add(sequencing)
    try:
        await db.flush()
        activity = await _create_activity(
            db,
            kind="sequencing",
            ref_id=sequencing.id,
            subject=subject,
            title=sequencing.title,
            access=payload.access,
            config=payload.config,
        )
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise Problem(409, "A sequencing activity with that slug already exists") from exc
    return _sequencing_out(sequencing, activity, subject)


@router.get("/sequencing/{activity_id}", response_model=SequencingAuthorOut)
async def get_sequencing(
    activity_id: uuid.UUID, db: AsyncSession = Depends(get_session)
) -> SequencingAuthorOut:
    activity, sequencing, subject = await _resolve_sequencing(db, activity_id)
    return _sequencing_out(sequencing, activity, subject)


@router.put("/sequencing/{activity_id}", response_model=SequencingAuthorOut)
async def update_sequencing(
    activity_id: uuid.UUID, payload: SequencingPutIn, db: AsyncSession = Depends(get_session)
) -> SequencingAuthorOut:
    activity, sequencing, subject = await _resolve_sequencing(db, activity_id)
    sequencing.title = payload.title
    sequencing.items = [i.model_dump() for i in payload.items]
    activity.title, activity.access, activity.config = payload.title, payload.access, payload.config
    await db.commit()
    return _sequencing_out(sequencing, activity, subject)


# ---------------------------------------------------------------------------
# Data tables (Task 11)
# ---------------------------------------------------------------------------


def _data_table_out(table: DataTable) -> DataTableOut:
    return DataTableOut(
        key=table.key, title=table.title, grid=table.grid, updated_at=table.updated_at
    )


@router.get("/data-tables", response_model=list[DataTableOut])
async def list_data_tables(db: AsyncSession = Depends(get_session)) -> list[DataTableOut]:
    """Every author-editable numeric lookup table (PDD/TMR/etc.) — the grid editor's list
    view (Task 16) and a calculator builder's table picker both read this."""
    rows = (await db.scalars(select(DataTable).order_by(DataTable.key))).all()
    return [_data_table_out(row) for row in rows]


@router.get("/data-tables/{key}", response_model=DataTableOut)
async def get_data_table(key: str, db: AsyncSession = Depends(get_session)) -> DataTableOut:
    table = await db.scalar(select(DataTable).where(DataTable.key == key))
    if table is None:
        raise Problem(404, "Data table not found")
    return _data_table_out(table)


@router.put("/data-tables/{key}", response_model=DataTableOut)
async def upsert_data_table(
    key: str,
    payload: DataTablePutIn,
    response: Response,
    user: User = Depends(require_author),
    db: AsyncSession = Depends(get_session),
) -> DataTableOut:
    """Create-or-replace one data table by its stable `key` (200 on update, 201 on create;
    there is no separate create endpoint). A calculator activity's `config["data_tables"]`
    references tables by this same key, resolved to a live row only at publish time (see
    `build_activity_snapshot`'s calculator branch) — editing a table here never touches an
    already-published calculator's frozen snapshot.
    """
    table = await db.scalar(select(DataTable).where(DataTable.key == key))
    created = table is None
    if table is None:
        table = DataTable(key=key, title=payload.title, grid=payload.grid.model_dump())
        db.add(table)
    else:
        table.title = payload.title
        table.grid = payload.grid.model_dump()
    table.updated_by = user.id
    await db.commit()
    await db.refresh(table)
    response.status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
    return _data_table_out(table)


# ---------------------------------------------------------------------------
# Calculator (Task 11)
# ---------------------------------------------------------------------------


def _calculator_out(activity: Activity, subject: Subject) -> CalculatorAuthorOut:
    return CalculatorAuthorOut(
        activity_id=activity.id,
        subject_slug=subject.slug,
        title=activity.title,
        status=activity.status,
        calc_type=activity.config.get("calc_type", ""),
        data_tables=list(activity.config.get("data_tables", [])),
    )


async def _resolve_calculator(db: AsyncSession, activity_id: uuid.UUID) -> tuple[Activity, Subject]:
    activity = await db.get(Activity, activity_id)
    if activity is None or activity.kind != "calculator":
        raise Problem(404, "Calculator not found")
    subject = await db.get(Subject, activity.subject_id)
    assert subject is not None
    return activity, subject


@router.post(
    "/calculators", response_model=CalculatorAuthorOut, status_code=status.HTTP_201_CREATED
)
async def create_calculator(
    payload: CalculatorCreateIn, db: AsyncSession = Depends(get_session)
) -> CalculatorAuthorOut:
    """Create a calculator activity. Unlike the other builders, it has no per-activity
    working-copy row of its own (see `_SLUG_MODELS`'s comment) — `ref_id` is a fresh id with
    nothing behind it, and its whole "content" is `config` itself: `calc_type` plus the
    `data_tables` keys it references, resolved to real `DataTable` rows only later, at
    publish/snapshot time.
    """
    subject = await _subject_for_create(db, payload.subject_slug)
    activity = await _create_activity(
        db,
        kind="calculator",
        ref_id=new_id(),
        subject=subject,
        title=payload.title,
        access="practice",
        config={"calc_type": payload.calc_type, "data_tables": payload.data_tables},
    )
    await db.commit()
    return _calculator_out(activity, subject)


@router.get("/calculators/{activity_id}", response_model=CalculatorAuthorOut)
async def get_calculator(
    activity_id: uuid.UUID, db: AsyncSession = Depends(get_session)
) -> CalculatorAuthorOut:
    activity, subject = await _resolve_calculator(db, activity_id)
    return _calculator_out(activity, subject)


@router.put("/calculators/{activity_id}", response_model=CalculatorAuthorOut)
async def update_calculator(
    activity_id: uuid.UUID, payload: CalculatorPutIn, db: AsyncSession = Depends(get_session)
) -> CalculatorAuthorOut:
    activity, subject = await _resolve_calculator(db, activity_id)
    activity.title = payload.title
    activity.config = {"calc_type": payload.calc_type, "data_tables": payload.data_tables}
    await db.commit()
    return _calculator_out(activity, subject)


# ---------------------------------------------------------------------------
# Publish, preview, versions (Task 10)
# ---------------------------------------------------------------------------


def _version_out(version: ContentVersion, author_display_name: str | None) -> VersionOut:
    return VersionOut(
        id=version.id,
        version=version.version,
        published_at=version.published_at,
        change_note=version.change_note,
        author_display_name=author_display_name,
    )


@router.post(
    "/activities/{activity_id}/publish",
    response_model=VersionOut,
    status_code=status.HTTP_201_CREATED,
)
async def publish(
    activity_id: uuid.UUID,
    payload: PublishIn,
    request: Request,
    user: User = Depends(require_author),
    db: AsyncSession = Depends(get_session),
) -> VersionOut:
    """Freeze the working copy into the next immutable version and point students at it.

    Clears `activity.config["import_notes"]` BEFORE snapshotting, not after:
    `build_activity_snapshot`/`_activity_part` copies `activity.config` verbatim into the
    frozen `ContentVersion.snapshot`, so clearing the notes only after publish would still
    leave the converter's review-queue notes baked into what students receive.
    """
    activity = await db.get(Activity, activity_id)
    if activity is None:
        raise Problem(404, "Activity not found")
    # The human pass supersedes the machine flags: publishing clears the review-queue notes.
    config = dict(activity.config)
    config.pop("import_notes", None)
    activity.config = config
    try:
        if activity.kind == "lesson":
            lesson = await db.get(Lesson, activity.lesson_id)
            assert lesson is not None  # Activity.lesson_id always resolves for kind "lesson"
            version = await publish_lesson(db, lesson, user, payload.change_note)
        else:
            version = await publish_activity(db, activity, user, payload.change_note)
    except ValueError as exc:
        # build_activity_snapshot's calculator branch raises this when config["data_tables"]
        # names a key with no DataTable row — an authoring-time mistake, not a server error.
        await db.rollback()
        raise Problem(422, str(exc)) from exc
    await record_audit(
        db,
        actor=user,
        action="publish_activity",
        target_type="activity",
        target_id=activity.id,
        request=request,
    )
    await db.commit()
    return _version_out(version, user.display_name)


@router.get("/activities/{activity_id}/preview")
async def preview_activity(
    activity_id: uuid.UUID, db: AsyncSession = Depends(get_session)
) -> dict[str, Any]:
    """The stripped snapshot of the activity's current working copy — byte-identical in
    shape to what the student route serves the moment this gets published, but reflecting
    edits made since the last publish (or none, if it's never been published)."""
    activity = await db.get(Activity, activity_id)
    if activity is None:
        raise Problem(404, "Activity not found")
    try:
        snapshot = await build_activity_snapshot(db, activity)
    except ValueError as exc:
        # build_activity_snapshot's calculator branch raises this when config["data_tables"]
        # names a key with no DataTable row — an authoring-time mistake, not a server error.
        raise Problem(422, str(exc)) from exc
    return strip_activity_answers(snapshot)


@router.get("/activities/{activity_id}/versions", response_model=list[VersionOut])
async def list_versions(
    activity_id: uuid.UUID, db: AsyncSession = Depends(get_session)
) -> list[VersionOut]:
    """Every published version of one activity, newest first."""
    activity = await db.get(Activity, activity_id)
    if activity is None:
        raise Problem(404, "Activity not found")
    rows = (
        await db.execute(
            select(ContentVersion, User.display_name)
            .outerjoin(User, User.id == ContentVersion.author_id)
            .where(ContentVersion.activity_id == activity_id)
            .order_by(ContentVersion.version.desc())
        )
    ).all()
    return [_version_out(version, display_name) for version, display_name in rows]
