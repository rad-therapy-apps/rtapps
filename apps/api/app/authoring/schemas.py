"""Pydantic request/response models for `app.authoring.router`'s lesson working-copy routes,
question bank, quiz/flashcard-deck/matching/sequencing activity builders, data tables, and
calculator activities.

What this file does: request bodies for creating a lesson, editing its meta, and replacing
its page tree, plus the response shapes for the subject/activity listings and the lesson
working copy itself (Task 8); a flattened question-bank in/out pair plus, per builder kind,
a `*CreateIn`/`*PutIn`/`*AuthorOut` trio (Task 9); `GridIn`/`DataTableOut`/`DataTablePutIn`
for the author-editable numeric lookup tables, and `Calculator*` for the calculator activity
kind, whose whole "content" is its `Activity.config` (Task 11).

Used here and why: `PagesIn` reuses `app.content.importer.PageImport` — the importer's
existing page/block Pydantic model — rather than redefining the page/block shape a second
time; that model is also what raises the prose-validation error a bad request body is
rejected with (see `app.content.importer._prose`), so reusing it is what makes `PUT
.../pages` reject an invalid body the same way the importer does. The builders reuse
`app.content.activity_importer`'s plain `FlashcardCard`/`MatchingPair`/`SequencingItem`
models verbatim (no validators of their own, so importing them carries no drift risk); the
importer's own `MatchingPayload`/`SequencingPayload`/`QuizQuestionData` classes bind their
duplicate/range validators to a different field set (slug, pass_percent, outcomes, ...) that
these builder payloads don't carry, so those validators are mirrored here (`_ActivityCreateMixin`
subclasses) rather than shared — see task-9-report.md for the reuse-vs-mirror rationale.
`_AccessConfigMixin` validates `access` against `app.content.models.ACTIVITY_ACCESS` so the
Pydantic-level check can never drift from the DB's own CHECK constraint. `CALC_TYPES` is the
calculator equivalent, but there is no DB CHECK backing it (`calc_type` lives inside the
free-form `Activity.config` JSONB, not its own column).

How it fits the project: plan 3b Task 8 (lessons), Task 9 (question bank + builders), and
Task 11 (data tables + calculator) — the authoring API's schema layer sitting between
`app.authoring.router` and the working-copy tables in `app.content.models`/
`app.content.activity_models`.

Depends on: `app.content.importer.PageImport`; `app.content.activity_importer` (`FlashcardCard`,
`MatchingPair`, `SequencingItem`); `app.content.models.ACTIVITY_ACCESS`.
Used by: `app.authoring.router`.
"""

import uuid
from datetime import datetime
from typing import Annotated, Any, Self

from pydantic import BaseModel, Field, field_validator, model_validator

from app.content.activity_importer import FlashcardCard, MatchingPair, SequencingItem
from app.content.importer import PageImport
from app.content.models import ACTIVITY_ACCESS

# Finite float type that rejects NaN and Infinity, for grid fields
FiniteFloat = Annotated[float, Field(allow_inf_nan=False)]


class LessonCreateIn(BaseModel):
    """Body for `POST /authoring/lessons`: the subject to file it under plus its meta."""

    subject_slug: str
    title: str = Field(min_length=1, max_length=200)
    slug: str = Field(min_length=1, max_length=120, pattern=r"^[a-z0-9][a-z0-9-]*$")


class LessonMetaIn(BaseModel):
    """Body for `PUT /authoring/lessons/{id}`: meta only, no pages."""

    title: str = Field(min_length=1, max_length=200)
    slug: str = Field(min_length=1, max_length=120, pattern=r"^[a-z0-9][a-z0-9-]*$")


class PagesIn(BaseModel):
    """Body for `PUT /authoring/lessons/{id}/pages`: the complete replacement page tree."""

    pages: list[PageImport]


class ActivityAuthorRow(BaseModel):
    """One row of `GET /authoring/subjects/{slug}/activities`."""

    activity_id: uuid.UUID
    kind: str
    title: str
    slug: str | None
    status: str
    access: str
    needs_review: bool
    import_notes: list[str]


class SubjectAuthorOut(BaseModel):
    """One row of `GET /authoring/subjects`: every subject, regardless of publish status."""

    id: uuid.UUID
    slug: str
    title: str
    activity_count: int


class LessonAuthorOut(BaseModel):
    """The lesson working copy: meta plus the unstripped page tree (answers included) —

    Task 15's editor consumes this verbatim.
    """

    activity_id: uuid.UUID
    lesson_id: uuid.UUID
    subject_slug: str
    slug: str
    title: str
    status: str
    import_notes: list[str]
    pages: list[dict[str, Any]]


# ---------------------------------------------------------------------------
# Question bank (Task 9)
# ---------------------------------------------------------------------------


class QuestionAuthorIn(BaseModel):
    """Body for `POST /authoring/questions` and `PUT /authoring/questions/{id}`: a single
    bank question with a plain-text stem/explanation — the router wraps/unwraps
    `app.content.activity_importer.text_doc()` on the way to/from `Question.stem`/
    `Question.explanation`, so no raw ProseMirror JSON crosses this API.
    """

    stem: str = Field(min_length=1)
    options: list[str] = Field(min_length=2, max_length=10)
    answer: int
    explanation: str | None = None

    @model_validator(mode="after")
    def _answer_in_range(self) -> Self:
        """Mirrors `activity_importer.QuizQuestionData._answer_in_range` — not shared
        directly since that validator is bound to a model carrying `outcomes`, a field this
        endpoint's contract doesn't expose."""
        if not 0 <= self.answer < len(self.options):
            raise ValueError(f"answer {self.answer} out of range for {len(self.options)} options")
        return self


class QuestionAuthorOut(BaseModel):
    """`QuestionAuthorIn`, flattened back out with its bank id."""

    id: uuid.UUID
    stem: str
    options: list[str]
    answer: int
    explanation: str | None


# ---------------------------------------------------------------------------
# Shared builder mixins (Task 9)
# ---------------------------------------------------------------------------


class _AccessConfigMixin(BaseModel):
    """`access`/`config` fields every builder's create/put body carries, validated against
    the same `ACTIVITY_ACCESS` CHECK constraint `Activity.access` enforces in the database.
    """

    access: str = Field(default="practice")
    config: dict[str, Any] = Field(default_factory=dict)

    @field_validator("access")
    @classmethod
    def _valid_access(cls, v: str) -> str:
        if v not in ACTIVITY_ACCESS:
            raise ValueError(f"access must be one of {ACTIVITY_ACCESS}")
        return v


class _ActivityCreateMixin(_AccessConfigMixin):
    """Meta fields every builder's `POST` (creation) body carries: which subject to file it
    under plus its own slug/title (same slug pattern as `LessonCreateIn`)."""

    subject_slug: str
    title: str = Field(min_length=1, max_length=200)
    slug: str = Field(min_length=1, max_length=120, pattern=r"^[a-z0-9][a-z0-9-]*$")


class _TitledPutMixin(_AccessConfigMixin):
    """Meta fields every builder's `PUT` (content replace) body carries. No `slug`: none of
    these builders support reslugging after creation (same as the quiz/flashcards/matching/
    sequencing importer, which never changes a slug on reimport either)."""

    title: str = Field(min_length=1, max_length=200)


# ---------------------------------------------------------------------------
# Quiz builder (Task 9)
# ---------------------------------------------------------------------------


class QuizCreateIn(_ActivityCreateMixin):
    """`POST /authoring/quizzes` body: meta only. Unlike flashcards/matching/sequencing, a
    quiz has no NOT NULL content column forcing questions up front — they live in the
    `quiz_question` join table, so a brand-new quiz can start with zero questions and have
    them added via `PUT /authoring/quizzes/{id}`."""


class QuizPutIn(_TitledPutMixin):
    """`PUT /authoring/quizzes/{id}` body: the ordered question-bank id list. Positions are
    rewritten 1..n in list order; an id absent from the bank, or repeated, is rejected."""

    question_ids: list[uuid.UUID]

    @model_validator(mode="after")
    def _unique_question_ids(self) -> Self:
        if len(set(self.question_ids)) != len(self.question_ids):
            raise ValueError("duplicate question ids")
        return self


class QuizAuthorOut(BaseModel):
    activity_id: uuid.UUID
    quiz_id: uuid.UUID
    subject_slug: str
    slug: str
    title: str
    status: str
    access: str
    config: dict[str, Any]
    questions: list[QuestionAuthorOut]


# ---------------------------------------------------------------------------
# Flashcard deck builder (Task 9)
# ---------------------------------------------------------------------------


class _FlashcardContentMixin(BaseModel):
    cards: list[FlashcardCard] = Field(min_length=1)


class FlashcardDeckCreateIn(_ActivityCreateMixin, _FlashcardContentMixin):
    """`POST /authoring/flashcard-decks` body: meta plus the initial card set (`cards` is a
    NOT NULL JSONB column on `FlashcardDeck`, so at least one card is required up front)."""


class FlashcardDeckPutIn(_TitledPutMixin, _FlashcardContentMixin):
    """`PUT /authoring/flashcard-decks/{id}` body: wholesale card-list replace."""


class FlashcardDeckAuthorOut(BaseModel):
    activity_id: uuid.UUID
    deck_id: uuid.UUID
    subject_slug: str
    slug: str
    title: str
    status: str
    access: str
    config: dict[str, Any]
    cards: list[FlashcardCard]


# ---------------------------------------------------------------------------
# Matching builder (Task 9)
# ---------------------------------------------------------------------------


class _MatchingContentMixin(BaseModel):
    pairs: list[MatchingPair] = Field(min_length=2)

    @model_validator(mode="after")
    def _unique_pairs(self) -> Self:
        """Same rule as `activity_importer.MatchingPayload`'s two validators, merged into
        one: no term, and no definition, may repeat across the pair list."""
        terms = [p.term for p in self.pairs]
        defs = [p.definition for p in self.pairs]
        if len(set(terms)) != len(terms) or len(set(defs)) != len(defs):
            raise ValueError("duplicate term or definition in pairs")
        return self


class MatchingCreateIn(_ActivityCreateMixin, _MatchingContentMixin):
    """`POST /authoring/matching` body: meta plus the initial pair set (`pairs` is a NOT
    NULL JSONB column on `MatchingActivity`, so at least two pairs are required up front)."""


class MatchingPutIn(_TitledPutMixin, _MatchingContentMixin):
    """`PUT /authoring/matching/{id}` body: wholesale pair-list replace."""


class MatchingAuthorOut(BaseModel):
    activity_id: uuid.UUID
    matching_id: uuid.UUID
    subject_slug: str
    slug: str
    title: str
    status: str
    access: str
    config: dict[str, Any]
    pairs: list[MatchingPair]


# ---------------------------------------------------------------------------
# Sequencing builder (Task 9)
# ---------------------------------------------------------------------------


class _SequencingContentMixin(BaseModel):
    items: list[SequencingItem] = Field(min_length=2)

    @model_validator(mode="after")
    def _unique_labels(self) -> Self:
        """No `activity_importer.SequencingPayload` equivalent exists (its importer allows
        duplicate labels, relying on `slug_key`'s numeric-suffix dedup for item keys); the
        authoring builder rejects them outright so two on-screen items are never visually
        indistinguishable to an author reordering them."""
        labels = [i.label for i in self.items]
        if len(set(labels)) != len(labels):
            raise ValueError("duplicate label in items")
        return self


class SequencingCreateIn(_ActivityCreateMixin, _SequencingContentMixin):
    """`POST /authoring/sequencing` body: meta plus the initial item set in correct order
    (`items` is a NOT NULL JSONB column on `SequencingActivity`, so at least two items are
    required up front)."""


class SequencingPutIn(_TitledPutMixin, _SequencingContentMixin):
    """`PUT /authoring/sequencing/{id}` body: wholesale item-list replace."""


class SequencingAuthorOut(BaseModel):
    activity_id: uuid.UUID
    sequencing_id: uuid.UUID
    subject_slug: str
    slug: str
    title: str
    status: str
    access: str
    config: dict[str, Any]
    items: list[SequencingItem]


# ---------------------------------------------------------------------------
# Publish, preview, versions (Task 10)
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Data tables (Task 11)
# ---------------------------------------------------------------------------


class GridRow(BaseModel):
    """One row of a data-table grid: a numeric row key (e.g. depth in cm) plus one value
    per column, in the same order as `GridIn.cols`."""

    key: FiniteFloat
    values: list[FiniteFloat] = Field(min_length=1)


class GridIn(BaseModel):
    """Body shape for `DataTable.grid`: a numeric lookup table with named row/col axes.
    `values` must line up 1:1 with `cols`; both `cols` and row `key`s must be strictly
    ascending, matching what Task 17's MU player assumes when it looks a value up."""

    row_label: str = Field(min_length=1, max_length=80)
    col_label: str = Field(min_length=1, max_length=80)
    cols: list[FiniteFloat] = Field(min_length=1)
    rows: list[GridRow] = Field(min_length=1)

    @model_validator(mode="after")
    def _consistent(self) -> Self:
        if any(len(r.values) != len(self.cols) for r in self.rows):
            raise ValueError("every row's values must match the number of cols")
        if sorted(self.cols) != self.cols or len(set(self.cols)) != len(self.cols):
            raise ValueError("cols must be strictly ascending")
        keys = [r.key for r in self.rows]
        if sorted(keys) != keys or len(set(keys)) != len(keys):
            raise ValueError("row keys must be strictly ascending")
        return self


class DataTableOut(BaseModel):
    """`GET /authoring/data-tables[/{key}]` response, and what `PUT` echoes back."""

    key: str
    title: str
    grid: dict[str, Any]
    updated_at: datetime


class DataTablePutIn(BaseModel):
    """Body for `PUT /authoring/data-tables/{key}`: an upsert keyed by the path's `key`
    (200 on update, 201 on create — there is no separate create endpoint)."""

    title: str = Field(min_length=1, max_length=200)
    grid: GridIn


# ---------------------------------------------------------------------------
# Calculator (Task 11)
# ---------------------------------------------------------------------------

# Not a DB CHECK constraint like ACTIVITY_ACCESS: calc_type lives inside Activity.config
# (free-form JSONB), so this closed set is enforced at the Pydantic layer only.
CALC_TYPES = ("mu",)


class _CalculatorContentMixin(BaseModel):
    """`calc_type`/`data_tables` fields shared by the calculator's create and put bodies —
    together these two fields ARE `Activity.config` for a calculator activity."""

    calc_type: str
    data_tables: list[str]

    @field_validator("calc_type")
    @classmethod
    def _valid_calc_type(cls, v: str) -> str:
        if v not in CALC_TYPES:
            raise ValueError(f"calc_type must be one of {CALC_TYPES}")
        return v


class CalculatorCreateIn(_CalculatorContentMixin):
    """`POST /authoring/calculators` body. No `access`/`slug`: a calculator has no
    per-activity working-copy row to slug (see `app.authoring.router._SLUG_MODELS`'s
    comment) and is always `access="practice"`."""

    subject_slug: str
    title: str = Field(min_length=1, max_length=200)


class CalculatorPutIn(_CalculatorContentMixin):
    """`PUT /authoring/calculators/{activity_id}` body: title plus the same content fields
    as create."""

    title: str = Field(min_length=1, max_length=200)


class CalculatorAuthorOut(BaseModel):
    activity_id: uuid.UUID
    subject_slug: str
    title: str
    status: str
    calc_type: str
    data_tables: list[str]


class PublishIn(BaseModel):
    """Body for `POST /authoring/activities/{id}/publish`: an optional human-readable note
    describing this publish, stored verbatim on the new `ContentVersion.change_note`."""

    change_note: str | None = None


class VersionOut(BaseModel):
    """One row of `GET /authoring/activities/{id}/versions`, and the shape a publish call
    itself returns for the version it just created."""

    id: uuid.UUID
    version: int
    published_at: datetime
    change_note: str | None
    author_display_name: str | None
