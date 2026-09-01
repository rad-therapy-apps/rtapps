# Plan 3a — Content Types, Migration, Analytics, Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Students complete quizzes (badge ≥ 80 %), flashcard decks, matching and sequencing activities migrated from every legacy subject; educators get per-activity stats, outcome mastery and CSV export; the hardening backlog (rate limits, admin guards, erase, purge, Sentry, program table) ships. Milestone **M3**, tag `v0.3.0`.

**Architecture:** The four new kinds reuse the existing spine end-to-end: per-type working-copy tables (`quiz`+`quiz_question` over the existing `question` bank; JSONB payloads for the other three) are published into immutable `content_version` snapshots by a generalized `publish_activity`; one new `gradeable_items(snapshot)` abstraction re-expresses every kind's answers as per-item single-choice (a matching pair = "pick the right definition", a sequencing item = "pick the right position"), so `grade_item`/`submit_attempt`/`upsert_activity_result` need no per-kind grading forks — only flashcards branch (completion-only, all score fields null). Assessment integrity is one column (`activity.access`) plus a student-read filter (ADR-0006). `tools/migrate-legacy` gains a JS-array extractor (pyjson5) + per-pattern classifiers and a `scan` command that walks the whole legacy repo; its committed JSON output is loaded by the existing importer.

**Tech Stack:** FastAPI · SQLAlchemy 2 async · Alembic · pyjson5 + BeautifulSoup (tools) · SvelteKit / Svelte 5 runes · `@rtapps/api-client` · Playwright · sentry-sdk / @sentry/sveltekit.

## Global Constraints

- Repo `/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps`, branch **`feat/content-types`** from `main` (≥ `69c27a2`); PR at the end; CI (`pr.yml`) must be green. Python via `uv run …` inside `apps/api` (or `tools/migrate-legacy`); JS via `pnpm`. Conventional Commits; commit after every task. **Never touch `.env*` files.**
- **File-header comments are mandatory** (repo standard): every new or substantially changed hand-written source/test/config file starts with the block `What this file does:` / `Used here and why:` / `How it fits the project:` / `Works with:` (`Depends on:` / `Used by:`), and every block of code gets a one-line comment saying what it does. Test files use `What this file tests:`. **The code blocks in this plan omit these headers for brevity — you MUST write them.** Generated files (`packages/api-client/src/schema.d.ts`, `openapi.json`, lockfiles, migrated content JSON under `apps/api/seed/content/`) are exempt.
- ruff line-length 100, `mypy --strict` clean, `ruff format` clean. Web: prettier (tabs), eslint, `svelte-check`. Run gates per task:
  `cd apps/api && uv run ruff check . && uv run ruff format --check . && uv run mypy . && uv run pytest -q > /tmp/pt.log 2>&1; echo "exit=$?"; tail -5 /tmp/pt.log` — **the `echo exit=$?` immediately after pytest is mandatory; never pipe pytest into `tail`/`head` directly (it swallows the exit code).** Expected `exit=0`.
- Local test DB: `TEST_DATABASE_URL=postgresql+asyncpg://rtapps:rtapps@localhost:5434/rtapps_test uv run pytest …` (container `rtapps-test-pg`; CI uses 5433 and needs no override).
- **After any change to API routes, response models, or route docstrings, run `make client` from the repo root** and commit the regenerated `packages/api-client` + `apps/api/openapi.json`; the contract CI job fails otherwise.
- API base `/api/v1`; errors RFC 9457 problem+json via `app.errors.Problem(status, title)`; non-GET requires `Origin` (already middleware-enforced). Role gates via `require_role(UserRole.educator, UserRole.admin)`; **admin passes wherever educator does**. Educator-cohort authorization ONLY via the existing `require_cohort_educator` dependency (404 unknown cohort / 403 not-owner).
- **Answer-leak invariants (test-pinned in Task 2):** a student-facing payload never contains `answer`, quiz/lesson `explanation`, matching pair alignment (definitions must be served **sorted alphabetically**, decoupled from term order), or sequencing correct order (items served sorted by label; item keys derived from labels, never positions). Grading always reads the **pinned** `content_version` snapshot server-side.
- **Access gate (ADR-0006):** `activity.access ∈ ('practice','assessment')`, default `practice`. Every student-facing catalog/read/attempt endpoint filters `access = 'practice'`; an assessment activity id returns `404 "Activity not found"` to students; educators/admin may read it. All imported/migrated content is `practice`.
- Web: `resolve()` for every internal href (group-prefixed route ids, e.g. `resolve('/(app)/subjects/[slug]/activities/[id]', {...})`); **no `{@html}`**; Svelte 5 runes (`$props()`, `$state`, `$derived`).
- Legacy repo (read-only, never modified): `/Users/christopherguzman/Desktop/coding_projects/rt-app/rtt_e_workbook`.
- Coverage gate unchanged (`--cov=app/grading --cov=app/auth --cov-fail-under=70`).
- Deviations from the spec (`docs/specs/2026-09-01-plan-3a-content-types-design.md`), decided during planning and to be recorded in the docs task: (1) `pass_percent`/`shuffle`/`present_n` live in `activity.config` (the existing pattern), not as columns on the per-type tables; (2) `matching.present_n` is stored but players present **all** pairs in 3a (per-attempt sampling arrives with assessment mode); (3) web Sentry is server-side (`hooks.server.ts`) only; (4) outcome mastery covers quiz items only (lesson knowledge-check `item_key`s are block keys, not question ids) — documented limitation; (5) `quiz.shuffle` is stored but the 3a player presents snapshot order (shuffling matters for assessment mode, and a deterministic order keeps e2e stable).

---

## File structure

| Path | Responsibility |
|---|---|
| `apps/api/app/content/activity_models.py` | `Quiz`, `QuizQuestion`, `FlashcardDeck`, `MatchingActivity`, `SequencingActivity`, `Outcome`, `QuestionOutcome` |
| `apps/api/app/content/models.py` | widen `ACTIVITY_KINDS`, add `ACTIVITY_ACCESS` + `Activity.access` |
| `apps/api/app/cohorts/models.py` | add `Program`, `Cohort.program_id` |
| `apps/api/alembic/versions/0006_content_types.py` | migration for all of the above |
| `apps/api/app/content/activity_snapshots.py` | `build_activity_snapshot`, `strip_activity_answers`, `gradeable_items`, `item_labels`, `slug_key` |
| `apps/api/app/content/service.py` | new `publish_activity`; `publish_lesson` refactored onto it |
| `apps/api/app/content/activity_importer.py` | `QuizImport`/`FlashcardsImport`/`MatchingImport`/`SequencingImport`, `import_any` |
| `apps/api/app/content/importer.py` | extract `_upsert_subject`; CLI sniffs doc type via `import_any` |
| `apps/api/app/content/router.py` | `GET /activities/{id}`, subject activities list, access gate |
| `apps/api/app/content/schemas.py` | `ActivityOut`, `ActivityRefOut`, `SubjectDetailOut.activities`, `SubjectOut.activity_count` |
| `apps/api/app/attempts/router.py` | resume in `start_attempt`; `gradeable_items` in `grade_item`; kind-aware `submit_attempt` |
| `apps/api/app/attempts/schemas.py` | `SavedItemOut`; `AttemptOut.items` |
| `apps/api/app/analytics/{queries,schemas,router}.py` | activity stats, outcome mastery, audited |
| `apps/api/app/analytics/csv_export.py` | `csv_response` + the three `.csv` endpoints' serializer |
| `apps/api/app/ratelimit.py` | in-process token bucket dependency (NFR-13) |
| `apps/api/app/admin/router.py` | last-admin guard, ILIKE escaping, `POST /users/{id}/erase` |
| `apps/api/app/tasks/{__init__,purge_sessions}.py` | session purge job (NFR-26) |
| `apps/api/app/seed.py` | import `seed/content/**` + demo quiz with outcomes + quiz attempts |
| `apps/api/seed/activities/demo-quiz.json` | deterministic quiz fixture (outcome-tagged) |
| `apps/api/seed/content/**` | committed migrated legacy content (generated, Task 8) |
| `tools/migrate-legacy/src/migrate_legacy/extract.py` | JS array-literal extractor (pyjson5) |
| `tools/migrate-legacy/src/migrate_legacy/activities.py` | classify + convert quiz/flashcards/matching/sequencing arrays |
| `tools/migrate-legacy/src/migrate_legacy/scan.py` + `cli.py` | `scan` command over the whole legacy tree |
| `apps/web/src/lib/activity/*` | types + 4 player components |
| `apps/web/src/routes/(app)/subjects/[slug]/activities/[id]/*` | generic activity page |
| `apps/web/src/routes/(app)/educator/cohorts/[id]/activities/[aid]/*`, `.../outcomes/*` | educator stats/outcomes pages + CSV links |
| `apps/web/e2e/quiz.e2e.ts` | student badge flow + educator stats/CSV |
| `docs/adr/0006-practice-assessment-separation.md`, docs 02/03/05/06, README | documentation |

Recommended execution order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17. Reviewers may run in parallel with the next implementer; only one implementer at a time.

---

### Task 1: Models and migration 0006

**Files:**
- Create: `apps/api/app/content/activity_models.py`
- Modify: `apps/api/app/content/models.py` (ACTIVITY_KINDS, ACTIVITY_ACCESS, `Activity.access`)
- Modify: `apps/api/app/cohorts/models.py` (append `Program`, add `Cohort.program_id`)
- Modify: `apps/api/alembic/env.py` (import the new models module for autogenerate metadata)
- Create: `apps/api/alembic/versions/0006_content_types.py`
- Test: `apps/api/tests/test_activity_models.py`
- Modify: `apps/api/tests/test_migrations.py` (head `"0005"` → `"0006"`)

**Interfaces:**
- Consumes: `app.db.Base`, `app.ids.new_id`, `app.auth.models.TimestampMixin`, existing `Question`.
- Produces (used by Tasks 2–10): classes `Quiz(id, slug, title, questions -> list[QuizQuestion])`, `QuizQuestion(quiz_id, question_id, position, question -> Question)`, `FlashcardDeck(id, slug, title, cards: list[dict])`, `MatchingActivity(id, slug, title, pairs: list[dict])`, `SequencingActivity(id, slug, title, items: list[dict])`, `Outcome(id, code, title)`, `QuestionOutcome(question_id, outcome_id)`, `Program(id, name)`; `Activity.access: str`; tuples `ACTIVITY_KINDS = ("lesson", "quiz", "flashcards", "matching", "sequencing")`, `ACTIVITY_ACCESS = ("practice", "assessment")`.

- [ ] **Step 1: Write the failing model test**

`apps/api/tests/test_activity_models.py` (helpers here are reused by later test files — keep the names):

```python
import uuid
from typing import Any

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

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
from app.cohorts.models import Cohort, Program


def text_doc(text: str) -> dict[str, Any]:
    """One-paragraph ProseMirror doc wrapping plain text (matches the importer's helper)."""
    return {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": text}]}]}


async def make_subject(db: AsyncSession, slug: str = "radiation-biology") -> Subject:
    subject = Subject(slug=slug, title="Radiation Biology", order=1)
    db.add(subject)
    await db.flush()
    return subject


async def make_quiz(db: AsyncSession, subject: Subject, slug: str = "ars-quiz") -> tuple[Quiz, Activity]:
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
    loaded = await db.get(Quiz, quiz.id)
    assert loaded is not None
    assert [qq.position for qq in loaded.questions] == [1, 2]
    assert loaded.questions[0].question.body["answer"] == 0
    assert activity.access == "practice"  # default


async def test_payload_types_round_trip(db: AsyncSession) -> None:
    deck = FlashcardDeck(slug="ars-cards", title="ARS Cards", cards=[{"term": "ARS", "definition": "Acute radiation syndrome"}])
    matching = MatchingActivity(slug="ars-match", title="ARS Match", pairs=[{"term": "Atrophy", "definition": "Shrinkage"}, {"term": "Epilation", "definition": "Hair loss"}])
    seq = SequencingActivity(slug="ars-order", title="ARS Stages", items=[{"label": "Prodromal"}, {"label": "Latent"}, {"label": "Manifest"}])
    db.add_all([deck, matching, seq])
    await db.flush()
    assert (await db.get(FlashcardDeck, deck.id)).cards[0]["term"] == "ARS"
    assert len((await db.get(MatchingActivity, matching.id)).pairs) == 2
    assert [i["label"] for i in (await db.get(SequencingActivity, seq.id)).items][0] == "Prodromal"


async def test_outcome_tagging(db: AsyncSession) -> None:
    subject = await make_subject(db)
    quiz, _ = await make_quiz(db, subject)
    outcome = Outcome(code="RB-1", title="Describe ARS stages")
    db.add(outcome)
    await db.flush()
    db.add(QuestionOutcome(question_id=quiz.questions[0].question_id, outcome_id=outcome.id))
    await db.flush()
    linked = await db.scalar(select(QuestionOutcome).where(QuestionOutcome.outcome_id == outcome.id))
    assert linked is not None


async def test_program_fk_on_cohort(db: AsyncSession) -> None:
    program = Program(name="RT Program")
    db.add(program)
    await db.flush()
    cohort = Cohort(name="Fall", join_code="AAAAAA", program_id=program.id)
    db.add(cohort)
    await db.flush()
    assert (await db.get(Cohort, cohort.id)).program_id == program.id
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/api && TEST_DATABASE_URL=postgresql+asyncpg://rtapps:rtapps@localhost:5434/rtapps_test uv run pytest tests/test_activity_models.py -q > /tmp/pt.log 2>&1; echo "exit=$?"; tail -5 /tmp/pt.log`
Expected: `exit=2`-style collection failure (`ModuleNotFoundError: app.content.activity_models`).

- [ ] **Step 3: Write the models**

`apps/api/app/content/activity_models.py` (header comment per convention, then):

```python
import uuid
from typing import Any

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.auth.models import TimestampMixin
from app.content.models import Question
from app.db import Base
from app.ids import new_id


# Working copy of a quiz: title + ordered question-bank rows via QuizQuestion. Pass
# percent and shuffle live in the paired Activity.config (the existing pattern), not here.
class Quiz(TimestampMixin, Base):
    __tablename__ = "quiz"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    # selectin: the snapshot builder always needs every question; batch-load them.
    questions: Mapped[list["QuizQuestion"]] = relationship(
        back_populates="quiz", order_by="QuizQuestion.position",
        cascade="all, delete-orphan", lazy="selectin",
    )


# Join row fixing a question's position within a quiz; the Question row itself is shared
# bank material (3b's builders reuse it across quizzes).
class QuizQuestion(Base):
    __tablename__ = "quiz_question"
    __table_args__ = (
        UniqueConstraint("quiz_id", "position", name="uq_quiz_question_position"),
        UniqueConstraint("quiz_id", "question_id", name="uq_quiz_question_question"),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    quiz_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("quiz.id", ondelete="CASCADE"), nullable=False
    )
    # CASCADE (unlike content_block's RESTRICT): deleting a bank question just drops it
    # from any quiz; the importer deletes questions explicitly on re-import anyway.
    question_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("question.id", ondelete="CASCADE"), nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    quiz: Mapped[Quiz] = relationship(back_populates="questions")
    question: Mapped[Question] = relationship(lazy="selectin")


# JSONB payload types: content the author edits wholesale (no per-row question bank).
class FlashcardDeck(TimestampMixin, Base):
    __tablename__ = "flashcard_deck"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    cards: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)  # [{term, definition}]


class MatchingActivity(TimestampMixin, Base):
    __tablename__ = "matching_activity"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    pairs: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)  # [{term, definition}]


class SequencingActivity(TimestampMixin, Base):
    __tablename__ = "sequencing_activity"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    items: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)  # correct order; [{label, detail?}]


# SLO/outcome vocabulary (FR-E-07); question-level tags only in 3a (FR-A-14 is 3b).
class Outcome(TimestampMixin, Base):
    __tablename__ = "outcome"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    code: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)


class QuestionOutcome(Base):
    __tablename__ = "question_outcome"
    __table_args__ = (
        UniqueConstraint("question_id", "outcome_id", name="uq_question_outcome"),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    question_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("question.id", ondelete="CASCADE"), nullable=False
    )
    outcome_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("outcome.id", ondelete="CASCADE"), nullable=False
    )
```

In `apps/api/app/content/models.py`, change the vocabulary tuples and `Activity` (touch nothing else):

```python
ACTIVITY_KINDS = ("lesson", "quiz", "flashcards", "matching", "sequencing")
ACTIVITY_ACCESS = ("practice", "assessment")
```

and inside `class Activity`, extend `__table_args__` and add the column:

```python
    __table_args__ = (
        _in("kind", ACTIVITY_KINDS, "ck_activity_kind"),
        _in("status", LESSON_STATUSES, "ck_activity_status"),
        _in("access", ACTIVITY_ACCESS, "ck_activity_access"),
    )
    ...
    # ADR-0006: 'practice' activities are student-visible; 'assessment' pools are reserved
    # for educator-assigned quizzing (games phase) and are 404 to students everywhere.
    access: Mapped[str] = mapped_column(String(20), nullable=False, default="practice")
```

In `apps/api/app/cohorts/models.py`, append (and add `Program` to the header's Used-by notes):

```python
# Single institution today; the nullable FK is the multi-program growth point (docs/03 §5).
class Program(TimestampMixin, Base):
    __tablename__ = "program"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
```

and on `Cohort`:

```python
    program_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("program.id", ondelete="SET NULL"), nullable=True
    )
```

In `apps/api/alembic/env.py`, add `import app.content.activity_models  # noqa: F401` beside the existing model imports (autogenerate metadata).

- [ ] **Step 4: Write migration 0006**

`apps/api/alembic/versions/0006_content_types.py` — follow 0005's style exactly (docstring header naming revision `"0006"`, `down_revision "0005"`):

```python
def upgrade() -> None:
    # program before cohort's FK to it.
    op.create_table(
        "program",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.add_column(
        "cohort",
        sa.Column("program_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("program.id", ondelete="SET NULL"), nullable=True),
    )
    # activity: the access flag (ADR-0006) and the widened kind vocabulary.
    op.add_column(
        "activity",
        sa.Column("access", sa.String(20), nullable=False, server_default="practice"),
    )
    op.create_check_constraint(
        "ck_activity_access", "activity", "access IN ('practice', 'assessment')"
    )
    op.drop_constraint("ck_activity_kind", "activity", type_="check")
    op.create_check_constraint(
        "ck_activity_kind", "activity",
        "kind IN ('lesson', 'quiz', 'flashcards', 'matching', 'sequencing')",
    )
    # quiz + quiz_question over the existing question bank.
    op.create_table(
        "quiz",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(120), nullable=False, unique=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "quiz_question",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("quiz_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("quiz.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("question.id", ondelete="CASCADE"), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.UniqueConstraint("quiz_id", "position", name="uq_quiz_question_position"),
        sa.UniqueConstraint("quiz_id", "question_id", name="uq_quiz_question_question"),
    )
    # The three JSONB payload types share one shape: id/slug/title/payload/timestamps.
    for table, payload in (("flashcard_deck", "cards"), ("matching_activity", "pairs"),
                           ("sequencing_activity", "items")):
        op.create_table(
            table,
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("slug", sa.String(120), nullable=False, unique=True),
            sa.Column("title", sa.String(200), nullable=False),
            sa.Column(payload, postgresql.JSONB(astext_type=sa.Text()), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
    # outcome vocabulary + question-level tags (FR-E-07).
    op.create_table(
        "outcome",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(40), nullable=False, unique=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "question_outcome",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("question_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("question.id", ondelete="CASCADE"), nullable=False),
        sa.Column("outcome_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("outcome.id", ondelete="CASCADE"), nullable=False),
        sa.UniqueConstraint("question_id", "outcome_id", name="uq_question_outcome"),
    )
    op.create_index("ix_question_outcome_outcome_id", "question_outcome", ["outcome_id"])


def downgrade() -> None:
    # Reverse dependency order; restore the original kind vocabulary.
    op.drop_table("question_outcome")
    op.drop_table("outcome")
    op.drop_table("sequencing_activity")
    op.drop_table("matching_activity")
    op.drop_table("flashcard_deck")
    op.drop_table("quiz_question")
    op.drop_table("quiz")
    op.drop_constraint("ck_activity_kind", "activity", type_="check")
    op.create_check_constraint("ck_activity_kind", "activity", "kind IN ('lesson')")
    op.drop_constraint("ck_activity_access", "activity", type_="check")
    op.drop_column("activity", "access")
    op.drop_column("cohort", "program_id")
    op.drop_table("program")
```

Update `tests/test_migrations.py`: the asserted head becomes `"0006"`.

- [ ] **Step 5: Run the suite and gates; commit**

Run the full gate command from Global Constraints. Expected `exit=0` (the schema-reset fixture replays 0006).

```bash
git add apps/api && git commit -m "feat(api): content-type tables, access flag, outcomes, program (migration 0006)"
```

### Task 2: Snapshot builders, answer stripping, gradeable items, generalized publish

**Files:**
- Create: `apps/api/app/content/activity_snapshots.py`
- Modify: `apps/api/app/content/service.py` (add `publish_activity`; refactor `publish_lesson` onto it — keep its signature)
- Test: `apps/api/tests/test_activity_snapshots.py`

**Interfaces:**
- Consumes: Task 1's models; existing `app.content.snapshot` (`build_snapshot`, `strip_answers`, `knowledge_checks`, `DEFAULT_CONFIG`), `ContentVersion`.
- Produces (used by Tasks 3–5, 9): `slug_key(text: str, seen: set[str]) -> str`; `async build_activity_snapshot(db, activity) -> dict`; `strip_activity_answers(snapshot: dict) -> dict`; `gradeable_items(snapshot: dict) -> dict[str, dict]` where each value is `{"body": {"options": list[str], "answer": int}, "explanation": Prose | None}`; `item_labels(snapshot: dict) -> dict[str, str]` (item key → short human label); `async publish_activity(db, activity, author: User | None, change_note: str | None = None) -> ContentVersion`.

**Snapshot shapes** (the contract every later task reads; `activity` part identical for all kinds):

```json
{"activity": {"id": "…", "kind": "quiz", "title": "…", "access": "practice",
              "config": {"pass_percent": 80, "shuffle": true}},
 "quiz": {"id": "…", "slug": "…", "title": "…", "subject": {"slug": "…", "title": "…"},
          "questions": [{"key": "<question uuid str>", "question_id": "…", "stem": {…},
                         "body": {"type": "single_choice", "options": ["…"], "answer": 0},
                         "explanation": {…}}]}}
```

- flashcards: `"flashcards": {…, "cards": [{"term": "…", "definition": "…"}]}` (nothing secret).
- matching: `"matching": {…, "pairs": [{"key": "pair_01", "term": "…", "definition": "…"}]}` — keys `pair_{i:02d}` in stored order.
- sequencing: `"sequencing": {…, "items": [{"key": "<slug_key(label)>", "label": "…", "detail": "…"?}]}` in **correct** order; keys derive from labels via `slug_key`, **never** from position (a `step_01` key would leak the answer).

- [ ] **Step 1: Write the failing tests**

`apps/api/tests/test_activity_snapshots.py` — reuse `make_subject`/`make_quiz`/`text_doc` from `tests.test_activity_models`:

```python
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.content.activity_models import FlashcardDeck, MatchingActivity, SequencingActivity
from app.content.activity_snapshots import (
    build_activity_snapshot,
    gradeable_items,
    item_labels,
    slug_key,
    strip_activity_answers,
)
from app.content.models import Activity, ContentVersion
from app.content.service import publish_activity
from tests.conftest import seed_lesson
from tests.test_activity_models import make_quiz, make_subject


def test_slug_key_is_stable_and_unique() -> None:
    seen: set[str] = set()
    assert slug_key("Prodromal Stage", seen) == "prodromal_stage"
    assert slug_key("Prodromal Stage", seen) == "prodromal_stage_2"  # collision suffix
    assert slug_key("X" * 80, set()).startswith("x")  # truncated to 40 chars
    assert len(slug_key("X" * 80, set())) <= 40


async def make_matching(db: AsyncSession, subject, slug: str = "ars-match"):
    m = MatchingActivity(slug=slug, title="ARS Match", pairs=[
        {"term": "Atrophy", "definition": "Shrinkage of organs"},
        {"term": "Epilation", "definition": "Loss of hair"},
        {"term": "ARS", "definition": "Acute radiation syndrome"},
    ])
    db.add(m)
    await db.flush()
    activity = Activity(kind="matching", ref_id=m.id, title=m.title,
                        subject_id=subject.id, config={"pass_percent": 80})
    db.add(activity)
    await db.flush()
    return m, activity


async def make_sequencing(db: AsyncSession, subject, slug: str = "ars-order"):
    s = SequencingActivity(slug=slug, title="ARS Stages", items=[
        {"label": "Prodromal"}, {"label": "Latent"}, {"label": "Manifest illness"},
    ])
    db.add(s)
    await db.flush()
    activity = Activity(kind="sequencing", ref_id=s.id, title=s.title,
                        subject_id=subject.id, config={"pass_percent": 80})
    db.add(activity)
    await db.flush()
    return s, activity


async def test_quiz_snapshot_strip_and_items(db: AsyncSession) -> None:
    subject = await make_subject(db)
    quiz, activity = await make_quiz(db, subject)
    snap = await build_activity_snapshot(db, activity)
    assert snap["activity"]["kind"] == "quiz"
    assert len(snap["quiz"]["questions"]) == 2
    # Item keys are the question uuids (stable across reorders).
    items = gradeable_items(snap)
    assert set(items) == {q["key"] for q in snap["quiz"]["questions"]}
    assert all(i["body"]["answer"] in (0, 1) for i in items.values())
    # Stripped payload: no answer, no explanation, anywhere.
    stripped = strip_activity_answers(snap)
    for q in stripped["quiz"]["questions"]:
        assert "answer" not in q["body"] and "explanation" not in q
    assert "answer" in snap["quiz"]["questions"][0]["body"]  # original untouched (deep copy)


async def test_matching_strip_decouples_alignment(db: AsyncSession) -> None:
    subject = await make_subject(db)
    m, activity = await make_matching(db, subject)
    snap = await build_activity_snapshot(db, activity)
    stripped = strip_activity_answers(snap)
    assert "pairs" not in stripped["matching"]
    assert [t["term"] for t in stripped["matching"]["terms"]] == ["Atrophy", "Epilation", "ARS"]
    # Definitions sorted alphabetically: index alignment with terms is destroyed.
    assert stripped["matching"]["definitions"] == sorted(p["definition"] for p in m.pairs)
    # Grading answers point into that same sorted list.
    items = gradeable_items(snap)
    defs = stripped["matching"]["definitions"]
    assert items["pair_01"]["body"]["options"] == defs
    assert defs[items["pair_01"]["body"]["answer"]] == "Shrinkage of organs"


async def test_sequencing_strip_hides_order_and_keys_do_not_leak(db: AsyncSession) -> None:
    subject = await make_subject(db)
    s, activity = await make_sequencing(db, subject)
    snap = await build_activity_snapshot(db, activity)
    # Keys derived from labels, not positions.
    keys = [i["key"] for i in snap["sequencing"]["items"]]
    assert keys == ["prodromal", "latent", "manifest_illness"]
    stripped = strip_activity_answers(snap)
    # Served sorted by label — presentation order ≠ correct order.
    assert [i["label"] for i in stripped["sequencing"]["items"]] == ["Latent", "Manifest illness", "Prodromal"]
    items = gradeable_items(snap)
    assert items["latent"]["body"]["answer"] == 1  # correct position of "Latent"
    assert items["latent"]["body"]["options"] == ["Position 1", "Position 2", "Position 3"]


async def test_flashcards_have_no_gradeable_items(db: AsyncSession) -> None:
    subject = await make_subject(db)
    deck = FlashcardDeck(slug="ars-cards", title="Cards", cards=[{"term": "T", "definition": "D"}])
    db.add(deck)
    await db.flush()
    activity = Activity(kind="flashcards", ref_id=deck.id, title="Cards",
                        subject_id=subject.id, config={})
    db.add(activity)
    await db.flush()
    snap = await build_activity_snapshot(db, activity)
    assert gradeable_items(snap) == {}
    assert strip_activity_answers(snap)["flashcards"]["cards"] == deck.cards


async def test_lesson_kind_delegates_to_existing_pipeline(db: AsyncSession) -> None:
    lesson = await seed_lesson(db, publish=False)
    from sqlalchemy import select
    activity = await db.scalar(select(Activity).where(Activity.lesson_id == lesson.id))
    snap = await build_activity_snapshot(db, activity)
    assert snap["activity"]["kind"] == "lesson"
    assert gradeable_items(snap)  # the fixture lesson has a knowledge check
    labels = item_labels(snap)
    assert set(labels) == set(gradeable_items(snap))


async def test_publish_activity_versions_and_pointers(db: AsyncSession) -> None:
    subject = await make_subject(db)
    _, activity = await make_quiz(db, subject)
    v1 = await publish_activity(db, activity, author=None, change_note="import")
    assert activity.status == "published" and activity.current_version_id == v1.id
    v2 = await publish_activity(db, activity, author=None)
    assert (v1.version, v2.version) == (1, 2)
    assert activity.current_version_id == v2.id
```

- [ ] **Step 2: Run to verify failure** (same command shape; expected: import error on `activity_snapshots`).

- [ ] **Step 3: Implement `activity_snapshots.py`**

```python
import copy
import re
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.content.activity_models import FlashcardDeck, MatchingActivity, Quiz, SequencingActivity
from app.content.models import Activity, Lesson, Subject
from app.content.snapshot import DEFAULT_CONFIG, build_snapshot, knowledge_checks, strip_answers

_KEY_RE = re.compile(r"[^a-z0-9_]+")


def slug_key(text: str, seen: set[str]) -> str:
    """Stable item key from human text: lowercase alnum/underscore, ≤40 chars, deduped
    with a numeric suffix. Never derived from position (position can be the answer)."""
    base = _KEY_RE.sub("_", text.lower()).strip("_")[:40] or "item"
    key, n = base, 1
    while key in seen:
        n += 1
        key = f"{base[:37]}_{n}"
    seen.add(key)
    return key


def _plain_text(doc: dict[str, Any]) -> str:
    """Concatenate a ProseMirror doc's text nodes (labels for analytics displays)."""
    out: list[str] = []

    def walk(node: dict[str, Any]) -> None:
        if node.get("type") == "text":
            out.append(str(node.get("text", "")))
        for child in node.get("content", []) or []:
            walk(child)

    walk(doc)
    return " ".join(" ".join(out).split())


def _activity_part(activity: Activity) -> dict[str, Any]:
    # Same merge as the lesson pipeline: DEFAULT_CONFIG under the stored config.
    return {
        "id": str(activity.id),
        "kind": activity.kind,
        "title": activity.title,
        "access": activity.access,
        "config": {**DEFAULT_CONFIG, **activity.config},
    }


async def _subject_ref(db: AsyncSession, activity: Activity) -> dict[str, str] | None:
    subject = await db.get(Subject, activity.subject_id)
    return {"slug": subject.slug, "title": subject.title} if subject else None


async def build_activity_snapshot(db: AsyncSession, activity: Activity) -> dict[str, Any]:
    """Resolve any activity's working copy into one snapshot document (unstripped)."""
    if activity.kind == "lesson":
        # Delegate to the existing lesson pipeline, then add the access field it predates.
        lesson = await db.get(Lesson, activity.lesson_id)
        if lesson is None:
            raise ValueError(f"activity {activity.id} has no lesson")
        snap = await build_snapshot(db, lesson)
        snap["activity"]["access"] = activity.access
        return snap
    subject = await _subject_ref(db, activity)
    if activity.kind == "quiz":
        quiz = await db.get(Quiz, activity.ref_id)
        assert quiz is not None
        questions = [
            {
                "key": str(qq.question_id),  # question uuid: stable across reorders
                "question_id": str(qq.question_id),
                "stem": qq.question.stem,
                "body": {"type": qq.question.type, **qq.question.body},
                "explanation": qq.question.explanation,
            }
            for qq in quiz.questions
        ]
        payload = {"id": str(quiz.id), "slug": quiz.slug, "title": quiz.title,
                   "subject": subject, "questions": questions}
        return {"activity": _activity_part(activity), "quiz": payload}
    if activity.kind == "flashcards":
        deck = await db.get(FlashcardDeck, activity.ref_id)
        assert deck is not None
        return {"activity": _activity_part(activity),
                "flashcards": {"id": str(deck.id), "slug": deck.slug, "title": deck.title,
                                "subject": subject, "cards": deck.cards}}
    if activity.kind == "matching":
        m = await db.get(MatchingActivity, activity.ref_id)
        assert m is not None
        pairs = [{"key": f"pair_{i:02d}", **p} for i, p in enumerate(m.pairs, start=1)]
        return {"activity": _activity_part(activity),
                "matching": {"id": str(m.id), "slug": m.slug, "title": m.title,
                              "subject": subject, "pairs": pairs}}
    if activity.kind == "sequencing":
        s = await db.get(SequencingActivity, activity.ref_id)
        assert s is not None
        seen: set[str] = set()
        items = [{"key": slug_key(i["label"], seen), **i} for i in s.items]
        return {"activity": _activity_part(activity),
                "sequencing": {"id": str(s.id), "slug": s.slug, "title": s.title,
                                "subject": subject, "items": items}}
    raise ValueError(f"unknown activity kind {activity.kind}")


def strip_activity_answers(snapshot: dict[str, Any]) -> dict[str, Any]:
    """Deep copy with everything answer-revealing removed — the ONLY shape a student sees."""
    kind = snapshot["activity"]["kind"]
    if kind == "lesson":
        return strip_answers(snapshot)
    out = copy.deepcopy(snapshot)
    if kind == "quiz":
        for q in out["quiz"]["questions"]:
            q["body"].pop("answer", None)
            q.pop("explanation", None)
    elif kind == "matching":
        # Alignment is the secret: replace aligned pairs with terms (stored order) and
        # definitions sorted alphabetically — sorted order is derivable from public data,
        # so grading (gradeable_items) can index into the same list.
        pairs = out["matching"].pop("pairs")
        out["matching"]["terms"] = [{"key": p["key"], "term": p["term"]} for p in pairs]
        out["matching"]["definitions"] = sorted(p["definition"] for p in pairs)
    elif kind == "sequencing":
        # Stored order is the answer: serve items sorted by label instead.
        out["sequencing"]["items"] = sorted(
            out["sequencing"]["items"], key=lambda i: str(i["label"]).lower()
        )
    # flashcards: nothing secret.
    return out


def gradeable_items(snapshot: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Every kind's answers as per-item single-choice: {key: {body: {options, answer}, explanation}}."""
    kind = snapshot["activity"]["kind"]
    if kind == "lesson":
        return {
            key: {"body": {"options": b["body"]["options"], "answer": b["body"]["answer"]},
                  "explanation": b.get("explanation")}
            for key, b in knowledge_checks(snapshot).items()
        }
    if kind == "quiz":
        return {
            q["key"]: {"body": {"options": q["body"]["options"], "answer": q["body"]["answer"]},
                        "explanation": q.get("explanation")}
            for q in snapshot["quiz"]["questions"]
        }
    if kind == "matching":
        pairs = snapshot["matching"]["pairs"]
        defs = sorted(p["definition"] for p in pairs)
        return {
            p["key"]: {"body": {"options": defs, "answer": defs.index(p["definition"])},
                        "explanation": None}
            for p in pairs
        }
    if kind == "sequencing":
        items = snapshot["sequencing"]["items"]
        options = [f"Position {j + 1}" for j in range(len(items))]
        return {
            it["key"]: {"body": {"options": options, "answer": idx}, "explanation": None}
            for idx, it in enumerate(items)
        }
    return {}  # flashcards: completion-only


def item_labels(snapshot: dict[str, Any]) -> dict[str, str]:
    """Short human label per gradeable item key (educator analytics displays)."""
    kind = snapshot["activity"]["kind"]
    if kind == "lesson":
        return {key: _plain_text(b["stem"]) for key, b in knowledge_checks(snapshot).items()}
    if kind == "quiz":
        return {q["key"]: _plain_text(q["stem"]) for q in snapshot["quiz"]["questions"]}
    if kind == "matching":
        return {p["key"]: p["term"] for p in snapshot["matching"]["pairs"]}
    if kind == "sequencing":
        return {i["key"]: i["label"] for i in snapshot["sequencing"]["items"]}
    return {}
```

Note for the implementer: `matching` uses `defs.index(...)`, so duplicate definitions would alias; the migration converter (Task 7) flags duplicate definitions as needs-review, and the importer (Task 3) rejects them.

- [ ] **Step 4: Refactor `service.py`**

Add `publish_activity` and make `publish_lesson` delegate (same public signature, same behavior — `tests/test_content_publish.py` must stay green):

```python
async def publish_activity(
    db: AsyncSession, activity: Activity, author: User | None, change_note: str | None = None
) -> ContentVersion:
    """Snapshot any activity's working copy, write the next version, repoint the activity."""
    snapshot = await build_activity_snapshot(db, activity)
    last = await db.scalar(
        select(func.max(ContentVersion.version)).where(ContentVersion.activity_id == activity.id)
    )
    version = ContentVersion(
        activity_id=activity.id, version=(last or 0) + 1, snapshot=snapshot,
        author_id=author.id if author else None,
        published_at=datetime.now(UTC), change_note=change_note,
    )
    db.add(version)
    await db.flush()
    activity.current_version_id = version.id
    activity.status = "published"
    await db.flush()
    return version


async def publish_lesson(
    db: AsyncSession, lesson: Lesson, author: User | None, change_note: str | None = None
) -> ContentVersion:
    """Lesson wrapper: publish the paired activity, then repoint the lesson too."""
    activity = await db.scalar(select(Activity).where(Activity.lesson_id == lesson.id))
    if activity is None:
        raise ValueError(f"lesson {lesson.slug} has no activity")
    version = await publish_activity(db, activity, author, change_note)
    lesson.current_version_id = version.id
    lesson.status = "published"
    await db.flush()
    return version
```

(`build_snapshot` import in `service.py` moves to `build_activity_snapshot`; existing lesson snapshots gain the `access` field — additive, nothing reads it yet.)

- [ ] **Step 5: Full gate; commit**

Expected `exit=0` including the pre-existing `test_content_publish.py`.

```bash
git add apps/api && git commit -m "feat(api): activity snapshots, answer stripping, gradeable items, generalized publish"
```

### Task 3: Activity importers and CLI

**Files:**
- Create: `apps/api/app/content/activity_importer.py`
- Modify: `apps/api/app/content/importer.py` (extract `_upsert_subject`; CLI `_run` uses `import_any`)
- Test: `apps/api/tests/test_activity_importer.py`

**Interfaces:**
- Consumes: Tasks 1–2 (`publish_activity`, models); `SubjectImport`, `_prose` machinery from `importer.py`.
- Produces (used by Tasks 5, 8, 9 tests and `seed.py`): Pydantic models `QuizImport`, `FlashcardsImport`, `MatchingImport`, `SequencingImport` (top-level shapes below); `text_doc(text: str) -> dict` (one-paragraph prose wrapper); `async import_any(db, data: dict, *, author: User | None = None) -> Activity` — validates + dispatches on the document's second top-level key (`lesson`/`quiz`/`flashcards`/`matching`/`sequencing`), upserts by slug, publishes, returns the Activity (for lessons, the lesson's paired activity).

**Import document shapes** (what `tools/migrate-legacy` emits in Tasks 6–7 — plain strings, wrapped to prose by the importer):

```json
{"subject": {"slug": "radiation-biology", "title": "Radiation Biology", "order": 0},
 "quiz": {"slug": "radiation-effects-quiz", "title": "Radiation Effects: Quiz",
          "pass_percent": 80, "shuffle": true,
          "questions": [{"stem": "…?", "options": ["A", "B"], "answer": 0,
                          "explanation": "…", "outcomes": ["RB-1"]}]}}
{"subject": {…}, "flashcards": {"slug": "…", "title": "…", "cards": [{"term": "…", "definition": "…"}]}}
{"subject": {…}, "matching": {"slug": "…", "title": "…", "present_n": null,
                              "pairs": [{"term": "…", "definition": "…"}]}}
{"subject": {…}, "sequencing": {"slug": "…", "title": "…", "items": [{"label": "…", "detail": "…"}]}}
```

Validation rules (Pydantic, mirroring `KnowledgeCheckImport`'s strictness): slugs match `^[a-z0-9]+(-[a-z0-9]+)*$` ≤120; titles 1–200; quiz `questions` ≥1, `options` 2–10, `answer` in range, `pass_percent` 0–100 default 80, `shuffle` default true, `outcomes` codes match `^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$` default `[]`; flashcards `cards` ≥1 with non-empty term/definition; matching `pairs` ≥2, **duplicate definitions rejected** (`ValueError("duplicate definition …")` — see Task 2's aliasing note) and duplicate terms rejected; sequencing `items` ≥2 with non-empty labels, duplicate labels allowed (slug_key dedupes).

- [ ] **Step 1: Write the failing tests**

`apps/api/tests/test_activity_importer.py`:

```python
from typing import Any

import pytest
from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.content.activity_importer import MatchingImport, QuizImport, import_any
from app.content.activity_models import Outcome, Question, QuestionOutcome, Quiz, QuizQuestion
from app.content.models import Activity, ContentVersion

SUBJECT = {"slug": "radiation-biology", "title": "Radiation Biology", "order": 1}
QUIZ_DOC: dict[str, Any] = {
    "subject": SUBJECT,
    "quiz": {"slug": "ars-quiz", "title": "ARS Quiz", "pass_percent": 80, "shuffle": True,
             "questions": [
                 {"stem": "Q1?", "options": ["A", "B", "C"], "answer": 0,
                  "explanation": "Because.", "outcomes": ["RB-1"]},
                 {"stem": "Q2?", "options": ["A", "B"], "answer": 1, "explanation": None,
                  "outcomes": ["RB-1", "RB-2"]},
             ]}}


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
    doc2 = {**QUIZ_DOC, "quiz": {**QUIZ_DOC["quiz"], "title": "ARS Quiz v2",
                                  "questions": QUIZ_DOC["quiz"]["questions"][:1]}}
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
        ({"subject": SUBJECT, "matching": {"slug": "m1", "title": "M", "pairs": [
            {"term": "T1", "definition": "D1"}, {"term": "T2", "definition": "D2"}]}}, "matching"),
        ({"subject": SUBJECT, "flashcards": {"slug": "f1", "title": "F",
                                              "cards": [{"term": "T", "definition": "D"}]}}, "flashcards"),
        ({"subject": SUBJECT, "sequencing": {"slug": "s1", "title": "S", "items": [
            {"label": "One"}, {"label": "Two"}]}}, "sequencing"),
    ):
        activity = await import_any(db, doc)
        assert activity.kind == kind and activity.status == "published"
        assert activity.access == "practice"


def test_matching_rejects_duplicate_definitions() -> None:
    with pytest.raises(ValidationError):
        MatchingImport.model_validate({"subject": SUBJECT, "matching": {
            "slug": "m2", "title": "M", "pairs": [
                {"term": "T1", "definition": "same"}, {"term": "T2", "definition": "same"}]}})


def test_quiz_rejects_answer_out_of_range() -> None:
    bad = {"subject": SUBJECT, "quiz": {"slug": "b", "title": "B", "questions": [
        {"stem": "Q?", "options": ["A", "B"], "answer": 5}]}}
    with pytest.raises(ValidationError):
        QuizImport.model_validate(bad)


async def test_import_any_rejects_unknown_document(db: AsyncSession) -> None:
    with pytest.raises(ValueError):
        await import_any(db, {"subject": SUBJECT, "mystery": {}})
```

- [ ] **Step 2: Run to verify failure** (import error).

- [ ] **Step 3: Implement**

In `importer.py`: extract the subject get-or-create from `import_lesson` into

```python
async def _upsert_subject(db: AsyncSession, doc: SubjectImport) -> Subject:
    """Reuse an existing subject by slug, or create it on first import."""
    subject = await db.scalar(select(Subject).where(Subject.slug == doc.slug))
    if subject is None:
        subject = Subject(slug=doc.slug, title=doc.title, order=doc.order)
        db.add(subject)
        await db.flush()
    return subject
```

and call it from `import_lesson`. Change `_run` to `doc = json.loads(path.read_text())` + `activity = await import_any(db, doc)` (import from `activity_importer`; print the kind and slug).

`activity_importer.py` core (Pydantic models per the shapes above, then):

```python
def text_doc(text: str) -> dict[str, Any]:
    """Wrap converter-emitted plain text in a one-paragraph closed-schema prose doc."""
    return {"type": "doc",
            "content": [{"type": "paragraph", "content": [{"type": "text", "text": text}]}]}


async def _upsert_outcome(db: AsyncSession, code: str) -> Outcome:
    outcome = await db.scalar(select(Outcome).where(Outcome.code == code))
    if outcome is None:
        outcome = Outcome(code=code, title=code)  # title = code until an admin edits it (3b)
        db.add(outcome)
        await db.flush()
    return outcome


async def _upsert_activity(
    db: AsyncSession, *, kind: str, ref_id: uuid.UUID, title: str,
    subject_id: uuid.UUID, config: dict[str, Any],
) -> Activity:
    activity = await db.scalar(
        select(Activity).where(Activity.kind == kind, Activity.ref_id == ref_id)
    )
    if activity is None:
        activity = Activity(kind=kind, ref_id=ref_id, title=title,
                            subject_id=subject_id, config=config)
        db.add(activity)
    else:
        activity.title, activity.subject_id, activity.config = title, subject_id, config
    await db.flush()
    return activity


async def import_quiz(db: AsyncSession, doc: QuizImport, *, author: User | None = None) -> Activity:
    subject = await _upsert_subject(db, doc.subject)
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
    for pos, item in enumerate(doc.quiz.questions, start=1):
        q = Question(type="single_choice", stem=text_doc(item.stem),
                     body={"options": item.options, "answer": item.answer},
                     explanation=text_doc(item.explanation) if item.explanation else None)
        db.add(q)
        await db.flush()
        quiz.questions.append(QuizQuestion(question_id=q.id, position=pos))
        for code in item.outcomes:
            outcome = await _upsert_outcome(db, code)
            db.add(QuestionOutcome(question_id=q.id, outcome_id=outcome.id))
    await db.flush()
    activity = await _upsert_activity(
        db, kind="quiz", ref_id=quiz.id, title=quiz.title, subject_id=subject.id,
        config={"pass_percent": doc.quiz.pass_percent, "shuffle": doc.quiz.shuffle},
    )
    await publish_activity(db, activity, author, change_note="import")
    return activity
```

`import_flashcards` / `import_matching` / `import_sequencing` follow the same upsert-payload-then-activity shape (payload column replaced wholesale; matching config `{"pass_percent": p.pass_percent, **({"present_n": p.present_n} if p.present_n else {})}`; flashcards config `{}`; sequencing `{"pass_percent": ...}`). `import_any`:

```python
_IMPORTERS: dict[str, tuple[type[BaseModel], Any]] = {
    "lesson": (LessonImport, import_lesson),
    "quiz": (QuizImport, import_quiz),
    "flashcards": (FlashcardsImport, import_flashcards),
    "matching": (MatchingImport, import_matching),
    "sequencing": (SequencingImport, import_sequencing),
}


async def import_any(db: AsyncSession, data: dict[str, Any], *, author: User | None = None) -> Activity:
    """Validate + dispatch an import document by its payload key; returns the published Activity."""
    kinds = [k for k in _IMPORTERS if k in data]
    if len(kinds) != 1:
        raise ValueError(f"import document must contain exactly one of {sorted(_IMPORTERS)}")
    model, fn = _IMPORTERS[kinds[0]]
    doc = model.model_validate(data)
    result = await fn(db, doc, author=author)
    if isinstance(result, Lesson):  # import_lesson returns the Lesson; callers want the Activity
        activity = await db.scalar(select(Activity).where(Activity.lesson_id == result.id))
        assert activity is not None
        return activity
    return result
```

(`import_lesson`'s signature has `publish`/`author` keywords — pass `author=author` only; mypy will hold you to the exact call.)

- [ ] **Step 4: Full gate; `make client` not needed (no route changes); commit**

```bash
git add apps/api && git commit -m "feat(api): quiz/flashcards/matching/sequencing importers with outcome tagging"
```

### Task 4: Student read API — activity snapshot route, subject activity lists, access gate

**Files:**
- Modify: `apps/api/app/content/schemas.py` (add `ActivityRefOut`, `ActivityOut`; extend `SubjectOut`, `SubjectDetailOut`)
- Modify: `apps/api/app/content/router.py` (new `GET /activities/{activity_id}`; rework `list_subjects` + `get_subject`)
- Test: `apps/api/tests/test_content_routes.py` (extend)
- Regenerate: `packages/api-client` + `apps/api/openapi.json` (`make client`)

**Interfaces:**
- Consumes: Task 2 `strip_activity_answers`; Task 3 `import_any` (test fixtures); existing `require_user`, `Problem`.
- Produces (used by Tasks 5, 14): `GET /api/v1/activities/{id}` → `ActivityOut {activity_id: UUID, content_version_id: UUID, kind: str, snapshot: dict}`; `SubjectDetailOut.activities: list[ActivityRefOut {id: UUID, kind: str, title: str}]` (published practice non-lesson activities, ordered by title); `SubjectOut.activity_count: int` (published practice activities of any kind).

**Behavior:**
- `GET /activities/{id}`: 404 `"Activity not found"` when the id is unknown, unpublished, has no current version, **or is `assessment` and the caller's role is `student`** (educator/admin may read assessment snapshots — still stripped). Response snapshot = `strip_activity_answers(version.snapshot)`.
- `get_subject`: 404 only when the subject has neither published lessons nor published practice activities; `activities` excludes kind `lesson` (lessons keep their own list).
- `list_subjects`: one grouped query over `Activity` (`status='published' AND access='practice'`), producing `lesson_count` (kind = lesson) and `activity_count` (all kinds); subjects with zero published activities are omitted, as today.

- [ ] **Step 1: Extend `tests/test_content_routes.py` with failing tests**

```python
from tests.test_activity_importer import QUIZ_DOC, SUBJECT  # shared fixture docs
from app.content.activity_importer import import_any


async def test_activity_snapshot_is_stripped(client: AsyncClient, db: AsyncSession) -> None:
    activity = await import_any(db, QUIZ_DOC)
    await register(client)
    r = await client.get(f"/api/v1/activities/{activity.id}")
    assert r.status_code == 200
    body = r.json()
    assert body["kind"] == "quiz"
    for q in body["snapshot"]["quiz"]["questions"]:
        assert "answer" not in q["body"] and "explanation" not in q


async def test_assessment_activity_hidden_from_students(client: AsyncClient, db: AsyncSession) -> None:
    activity = await import_any(db, QUIZ_DOC)
    activity.access = "assessment"
    await db.flush()
    await register(client, email="s@example.edu")
    r = await client.get(f"/api/v1/activities/{activity.id}")
    assert r.status_code == 404  # indistinguishable from missing (ADR-0006)
    # …and absent from the subject catalog.
    r = await client.get("/api/v1/subjects/radiation-biology")
    assert r.status_code == 404 or all(
        a["id"] != str(activity.id) for a in r.json().get("activities", [])
    )


async def test_educator_can_read_assessment_snapshot(client: AsyncClient, db: AsyncSession) -> None:
    activity = await import_any(db, QUIZ_DOC)
    activity.access = "assessment"
    await db.flush()
    await register(client, email="e@example.edu")
    await promote(db, "e@example.edu", UserRole.educator)   # helper from tests.test_cohorts
    await login(client, "e@example.edu")
    r = await client.get(f"/api/v1/activities/{activity.id}")
    assert r.status_code == 200
    # Stripped even for educators on this route (authoring reads come in 3b).
    assert "answer" not in r.json()["snapshot"]["quiz"]["questions"][0]["body"]


async def test_subject_lists_activities_grouped(client: AsyncClient, db: AsyncSession) -> None:
    await import_any(db, QUIZ_DOC)
    await import_any(db, {"subject": SUBJECT, "flashcards": {
        "slug": "cards1", "title": "Cards", "cards": [{"term": "T", "definition": "D"}]}})
    await register(client)
    r = await client.get("/api/v1/subjects/radiation-biology")
    assert r.status_code == 200  # no lessons needed when activities exist
    kinds = sorted(a["kind"] for a in r.json()["activities"])
    assert kinds == ["flashcards", "quiz"]
    r = await client.get("/api/v1/subjects")
    row = next(s for s in r.json() if s["slug"] == "radiation-biology")
    assert row["activity_count"] == 2 and row["lesson_count"] == 0
```

(Adjust imports at the top of the file to bring in `promote`, `login` from `tests.test_cohorts` and `UserRole`.)

- [ ] **Step 2: Run to verify failures** (404s / missing fields).

- [ ] **Step 3: Implement**

`schemas.py` additions (keep existing models untouched; `SubjectOut` gains `activity_count: int`):

```python
class ActivityRefOut(BaseModel):
    id: uuid.UUID
    kind: str
    title: str


class SubjectDetailOut(BaseModel):
    ...  # existing fields
    activities: list[ActivityRefOut] = []


class ActivityOut(BaseModel):
    activity_id: uuid.UUID
    content_version_id: uuid.UUID
    kind: str
    snapshot: dict[str, Any]
```

`router.py`:

```python
@router.get("/activities/{activity_id}", response_model=ActivityOut)
async def get_activity(
    activity_id: uuid.UUID,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_session),
) -> ActivityOut:
    """One activity's current published snapshot, answers stripped.

    ADR-0006: students never see assessment activities — same 404 as a missing id.
    """
    activity = await db.get(Activity, activity_id)
    if activity is None or activity.status != "published" or activity.current_version_id is None:
        raise Problem(404, "Activity not found")
    if activity.access != "practice" and user.role == UserRole.student:
        raise Problem(404, "Activity not found")
    version = await db.get(ContentVersion, activity.current_version_id)
    if version is None:
        raise Problem(404, "Activity not found")
    return ActivityOut(
        activity_id=activity.id, content_version_id=version.id, kind=activity.kind,
        snapshot=strip_activity_answers(version.snapshot),
    )
```

`list_subjects` becomes one query over `Activity` (join `Subject`), counting `lesson_count` via `func.count(Activity.id).filter(Activity.kind == "lesson")` and `activity_count` via `func.count(Activity.id)`, `where(Activity.status == "published", Activity.access == "practice")`. `get_subject` additionally selects `Activity` rows (`subject_id`, published, practice, `kind != "lesson"`, ordered by `Activity.title`) into `activities`, and 404s only when both lists are empty.

- [ ] **Step 4: Full gate; then `make client` from repo root; commit**

```bash
git add apps/api packages/api-client && git commit -m "feat(api): activity read route, subject activity lists, assessment access gate"
```

### Task 5: Attempts — resume, generalized grading, kind-aware submit

**Files:**
- Modify: `apps/api/app/attempts/schemas.py` (add `SavedItemOut`; `AttemptOut.items`)
- Modify: `apps/api/app/attempts/router.py` (`start_attempt` resume; `grade_item` via `gradeable_items`; `submit_attempt` flashcards branch + access-gated start)
- Test: `apps/api/tests/test_attempts.py` (extend), `apps/api/tests/test_rollup.py` (extend: null-percent rollup)
- Regenerate: `make client`

**Interfaces:**
- Consumes: Task 2 `gradeable_items`; Task 3 `import_any` (fixtures); Task 4 semantics.
- Produces (used by Tasks 8, 14–15): `POST /activities/{id}/attempts` → 201 `AttemptOut` where `items: list[SavedItemOut {item_key, response, correct, score, max_score}]` — **returns the caller's existing `in_progress` attempt (with saved items) instead of creating a second one**; `POST /attempts/{id}/items` unchanged shape, now valid for every gradeable kind; `POST /attempts/{id}/submit` — for `flashcards`, sets `score/max_score/percent/passed` all `None`, status `submitted`, rollup mastery `attempted`.

**Behavior details:**
- `start_attempt` access gate mirrors Task 4: student + `access != 'practice'` → 404 `"Activity not found"`.
- Resume ignores `content_version_id` drift: an in-progress attempt pinned to an older version is still returned (the student finishes what they started); a fresh attempt is only created when none is in progress.
- `submit_attempt` reads `kind = version.snapshot["activity"]["kind"]`; the existing score math runs for every kind except `flashcards` (where `max_score = 0` would otherwise fake `percent = 100.0`).

- [ ] **Step 1: Failing tests** (extend `test_attempts.py`; reuse `register` from conftest, `QUIZ_DOC` from `test_activity_importer`):

```python
async def test_start_attempt_resumes_in_progress(client: AsyncClient, db: AsyncSession) -> None:
    activity = await import_any(db, QUIZ_DOC)
    await register(client)
    r1 = await client.post(f"/api/v1/activities/{activity.id}/attempts")
    assert r1.status_code == 201 and r1.json()["items"] == []
    snap = (await client.get(f"/api/v1/activities/{activity.id}")).json()["snapshot"]
    key = snap["quiz"]["questions"][0]["key"]
    await client.post(f"/api/v1/attempts/{r1.json()['id']}/items",
                      json={"item_key": key, "response": {"choice": 0}})
    r2 = await client.post(f"/api/v1/activities/{activity.id}/attempts")
    assert r2.json()["id"] == r1.json()["id"]           # resumed, not duplicated
    assert r2.json()["items"][0]["item_key"] == key      # saved item comes back
    assert r2.json()["items"][0]["response"] == {"choice": 0}


async def test_quiz_submit_grades_and_passes(client: AsyncClient, db: AsyncSession) -> None:
    activity = await import_any(db, QUIZ_DOC)  # answers: q1 -> 0, q2 -> 1
    await register(client)
    snap = (await client.get(f"/api/v1/activities/{activity.id}")).json()["snapshot"]
    attempt = (await client.post(f"/api/v1/activities/{activity.id}/attempts")).json()
    for q, choice in zip(snap["quiz"]["questions"], (0, 1), strict=True):
        r = await client.post(f"/api/v1/attempts/{attempt['id']}/items",
                              json={"item_key": q["key"], "response": {"choice": choice}})
        assert r.json()["correct"] is True
    r = await client.post(f"/api/v1/attempts/{attempt['id']}/submit",
                          headers={"Idempotency-Key": "k1"})
    assert r.json()["percent"] == 100.0 and r.json()["passed"] is True


async def test_matching_and_sequencing_grade_via_items(client: AsyncClient, db: AsyncSession) -> None:
    m = await import_any(db, {"subject": SUBJECT, "matching": {"slug": "m1", "title": "M", "pairs": [
        {"term": "T1", "definition": "Alpha"}, {"term": "T2", "definition": "Beta"}]}})
    await register(client)
    snap = (await client.get(f"/api/v1/activities/{m.id}")).json()["snapshot"]
    defs = snap["matching"]["definitions"]  # sorted: ["Alpha", "Beta"]
    attempt = (await client.post(f"/api/v1/activities/{m.id}/attempts")).json()
    # T1 -> Alpha correct; T2 -> Alpha wrong.
    k1, k2 = (t["key"] for t in snap["matching"]["terms"])
    assert (await client.post(f"/api/v1/attempts/{attempt['id']}/items",
            json={"item_key": k1, "response": {"choice": defs.index("Alpha")}})).json()["correct"]
    assert not (await client.post(f"/api/v1/attempts/{attempt['id']}/items",
            json={"item_key": k2, "response": {"choice": defs.index("Alpha")}})).json()["correct"]
    r = await client.post(f"/api/v1/attempts/{attempt['id']}/submit",
                          headers={"Idempotency-Key": "k2"})
    assert r.json()["percent"] == 50.0 and r.json()["passed"] is False


async def test_flashcards_submit_is_completion_only(client: AsyncClient, db: AsyncSession) -> None:
    deck = await import_any(db, {"subject": SUBJECT, "flashcards": {
        "slug": "f1", "title": "F", "cards": [{"term": "T", "definition": "D"}]}})
    await register(client)
    attempt = (await client.post(f"/api/v1/activities/{deck.id}/attempts")).json()
    r = await client.post(f"/api/v1/attempts/{attempt['id']}/submit",
                          headers={"Idempotency-Key": "k3"})
    body = r.json()
    assert body["status"] == "submitted"
    assert body["score"] is None and body["percent"] is None and body["passed"] is None


async def test_student_cannot_start_assessment_attempt(client: AsyncClient, db: AsyncSession) -> None:
    activity = await import_any(db, QUIZ_DOC)
    activity.access = "assessment"
    await db.flush()
    await register(client)
    r = await client.post(f"/api/v1/activities/{activity.id}/attempts")
    assert r.status_code == 404
```

In `test_rollup.py`, add: a flashcards completion attempt run through `upsert_activity_result` leaves `best_percent is None`, `attempts == 1`, `mastery == "attempted"`.

- [ ] **Step 2: Run to verify failures.**

- [ ] **Step 3: Implement**

`schemas.py`: `SavedItemOut(BaseModel)` with `item_key: str`, `response: dict[str, Any]`, `correct: bool | None`, `score: float | None`, `max_score: float | None` (`model_config = ConfigDict(from_attributes=True)`), and on `AttemptOut`: `items: list[SavedItemOut] = []`.

`router.py` `start_attempt` — after the existing published-404 check:

```python
    # ADR-0006: students cannot start attempts on assessment activities (same 404).
    if activity.access != "practice" and user.role == UserRole.student:
        raise Problem(404, "Activity not found")
    # Resume: one in-progress attempt per (user, activity) — return it with its saved
    # items instead of stacking a duplicate (FR: attempt resume).
    existing = await db.scalar(
        select(Attempt)
        .where(Attempt.user_id == user.id, Attempt.activity_id == activity.id,
               Attempt.status == "in_progress")
        .order_by(Attempt.started_at.desc())
        .limit(1)
    )
    if existing is not None:
        return existing
```

`grade_item`: replace `knowledge_checks(version.snapshot).get(body.item_key)` with `gradeable_items(version.snapshot).get(body.item_key)`; the grade call becomes `grade_single_choice(block["body"], body.response)` and the response's explanation `block["explanation"]` (shape per Task 2). `submit_attempt`: replace `knowledge_checks` with `gradeable_items` and branch:

```python
    kind = version.snapshot["activity"]["kind"]
    if kind == "flashcards":
        # Completion-only: no score fields at all (max_score 0 must not fake percent=100).
        attempt.score = attempt.max_score = attempt.percent = None
        attempt.passed = None
    else:
        ...  # existing score/max/percent/passed math, unchanged
```

(duration/status/idempotency/rollup lines stay shared below the branch.)

- [ ] **Step 4: Full gate; `make client`; commit**

```bash
git add apps/api packages/api-client && git commit -m "feat(api): attempt resume, generalized item grading, flashcards completion submit"
```

### Task 6: migrate-legacy — JS array extractor + quiz/flashcards converters

**Files:**
- Modify: `tools/migrate-legacy/pyproject.toml` (add dependency `pyjson5>=1.6`)
- Create: `tools/migrate-legacy/src/migrate_legacy/extract.py`
- Create: `tools/migrate-legacy/src/migrate_legacy/activities.py`
- Test: `tools/migrate-legacy/tests/test_extract.py`, `tools/migrate-legacy/tests/test_activities.py`
- Fixtures: `tools/migrate-legacy/tests/fixtures/quiz_page.html`, `flashcards_page.html` (golden inputs, hand-reduced from real legacy pages — see below)

**Legacy reality (verified against the repo):** activity data lives in inline `<script>` blocks as `const <name> = [ {…}, … ];` literals with unquoted keys and single quotes. Observed shapes:
- quiz: `quizData = [{question: str, options: [str], answer: "<option text>", explanation?: str}]` (answer is the option's **text**, not an index);
- flashcards: `flashcardData = [{term, definition}]` (often in a separate `*_flashcards_activity.html` file);
- matching: `matchingData = [{id?, term, definition}]` (same key shape as flashcards — disambiguated by name/filename);
- sequencing: `journeyStages = [{id, order: int, name|title|label, description?}]` (rare, bespoke).
Variable names vary page to page; classification is by **key signature first, name/filename second**, with `needs-review` for anything ambiguous. Some quiz pages instead use radio inputs + a `correctAnswers = {q1: 'b', …}` map (e.g. `Ethics/HIPAA/hipaa_quiz`) — those are NOT converted in 3a; they classify `unsupported` with a note and land on the fix-list.

**Interfaces:**
- Produces (used by Task 7): `extract.js_arrays(html: str, notes: list[str]) -> dict[str, list[Any]]` — every top-level `const/let/var NAME = [ … ];` whose bracket-matched literal parses via `pyjson5` into a non-empty list of dicts; parse failures append a note and skip. `activities.classify_arrays(arrays: dict[str, list], filename: str, notes: list[str]) -> list[tuple[str, str, list]]` — `(kind, name, data)` per convertible array. `activities.convert_quiz(data, *, slug, title, notes) -> dict` (import doc `{"quiz": …}` **without** the `subject` key — Task 7's scanner injects it), and likewise `convert_flashcards`, `convert_matching`, `convert_sequencing` (Task 7).

- [ ] **Step 1: Failing extractor test**

`tests/test_extract.py`:

```python
from migrate_legacy.extract import js_arrays

HTML = """
<script>
  const quizData = [
    { question: "Q1?", options: ["A", "B"], answer: "B" },
    { question: "It's tricky?", options: ["Yes", "No"], answer: "Yes", explanation: "Because." },
  ];
  const notAList = { a: 1 };
  const broken = [ { question: template`nope` } ];
  let flashcardData = [ { term: 'ARS', definition: "Acute [radiation] syndrome, 1 Gy+" } ];
</script>
"""


def test_extracts_parseable_arrays_only() -> None:
    notes: list[str] = []
    arrays = js_arrays(HTML, notes)
    assert set(arrays) == {"quizData", "flashcardData"}
    assert arrays["quizData"][1]["question"] == "It's tricky?"      # apostrophes survive
    assert arrays["flashcardData"][0]["definition"].startswith("Acute [radiation]")  # brackets in strings
    assert any("broken" in n for n in notes)                         # unparseable flagged, not fatal
```

- [ ] **Step 2: Run to verify failure**

Run: `cd tools/migrate-legacy && uv sync && uv run pytest tests/test_extract.py -q > /tmp/pt.log 2>&1; echo "exit=$?"; tail -5 /tmp/pt.log`

- [ ] **Step 3: Implement `extract.py`**

```python
import re
from typing import Any

import pyjson5

# Matches the declaration up to its opening bracket; the literal itself is bracket-matched
# below because regexes can't balance nesting or skip string contents.
_DECL_RE = re.compile(r"(?:const|let|var)\s+(\w+)\s*=\s*\[")


def _match_bracket(text: str, start: int) -> int | None:
    """Index just past the ']' matching text[start] == '[', honouring JS strings/escapes."""
    depth, i, quote = 0, start, None
    while i < len(text):
        c = text[i]
        if quote:
            if c == "\\":
                i += 2
                continue
            if c == quote:
                quote = None
        elif c in "'\"`":
            quote = c
        elif c == "[":
            depth += 1
        elif c == "]":
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1
    return None


def js_arrays(html: str, notes: list[str]) -> dict[str, list[Any]]:
    """Every parseable `const NAME = [ {…} ];` array-of-objects literal in the document."""
    out: dict[str, list[Any]] = {}
    for m in _DECL_RE.finditer(html):
        name = m.group(1)
        end = _match_bracket(html, m.end() - 1)
        if end is None:
            notes.append(f"unbalanced array literal {name}")
            continue
        literal = html[m.end() - 1 : end]
        try:
            value = pyjson5.decode(literal)
        except Exception:  # noqa: BLE001 — any parse failure just flags the array
            notes.append(f"unparseable array literal {name}")
            continue
        # Only arrays of objects are candidate activity data.
        if isinstance(value, list) and value and all(isinstance(v, dict) for v in value):
            out[name] = value
    return out
```

- [ ] **Step 4: Failing classifier/converter tests**

`tests/test_activities.py`:

```python
from migrate_legacy.activities import classify_arrays, convert_flashcards, convert_quiz


def test_classify_by_key_signature_and_name() -> None:
    notes: list[str] = []
    arrays = {
        "quizData": [{"question": "Q?", "options": ["A"], "answer": "A"}],
        "matchingData": [{"term": "T", "definition": "D"}],
        "flashcardData": [{"term": "T", "definition": "D"}],
        "cards": [{"term": "T", "definition": "D"}],                      # ambiguous name
        "journeyStages": [{"id": "s1", "order": 1, "name": "One"}],
        "layout": [{"top": "50%", "left": "10%", "name": "x", "description": "y"}],  # positional art
    }
    kinds = dict((name, kind) for kind, name, _ in
                 classify_arrays(arrays, "index.html", notes))
    assert kinds["quizData"] == "quiz"
    assert kinds["matchingData"] == "matching"
    assert kinds["flashcardData"] == "flashcards"
    assert kinds["cards"] == "flashcards"          # default for term/definition
    assert any("ambiguous" in n and "cards" in n for n in notes)
    assert kinds["journeyStages"] == "sequencing"
    assert "layout" not in kinds                    # top/left keys => decorative, skipped


def test_convert_quiz_maps_answer_text_to_index() -> None:
    notes: list[str] = []
    doc = convert_quiz(
        [{"question": "Q1?", "options": ["Atrophy", "Erythema"], "answer": "Erythema"},
         {"question": "Q2?", "options": ["A", "B"], "answer": "MISSING", "explanation": "E."}],
        slug="radiation-effects-quiz", title="Radiation Effects: Quiz", notes=notes)
    q1, q2 = doc["quiz"]["questions"]
    assert q1["answer"] == 1
    assert q2["answer"] == 0 and any("no correct answer" in n for n in notes)
    assert q2["explanation"] == "E."
    assert doc["quiz"]["pass_percent"] == 80


def test_convert_flashcards_passthrough() -> None:
    doc = convert_flashcards([{"term": "ARS", "definition": "…"}], slug="s", title="T", notes=[])
    assert doc["flashcards"]["cards"] == [{"term": "ARS", "definition": "…"}]
```

- [ ] **Step 5: Implement `activities.py`** (classifier + quiz/flashcards converters; matching/sequencing converters arrive in Task 7 but the classifier lands whole now)

```python
from typing import Any

QUIZ_KEYS = {"question", "options", "answer"}
CARD_KEYS = {"term", "definition"}
# Keys marking a positioned diagram/label overlay, not an activity (seen in legacy pages).
DECOR_KEYS = {"top", "left"}


def _common_keys(data: list[dict[str, Any]]) -> set[str]:
    keys = set(data[0])
    for row in data[1:]:
        keys &= set(row)
    return keys


def classify_arrays(
    arrays: dict[str, list[Any]], filename: str, notes: list[str]
) -> list[tuple[str, str, list[Any]]]:
    """Classify each extracted array by key signature, then name/filename hints."""
    out: list[tuple[str, str, list[Any]]] = []
    fname = filename.lower()
    for name, data in arrays.items():
        keys = _common_keys(data)
        lname = name.lower()
        if DECOR_KEYS <= keys:
            continue  # positioned overlay data (diagram labels), not an activity
        if QUIZ_KEYS <= keys:
            out.append(("quiz", name, data))
        elif CARD_KEYS <= keys or {"name", "description"} <= keys:
            # term/definition is shared by flashcards and matching; the variable or file
            # name decides, defaulting to flashcards with a review flag.
            if "match" in lname or "match" in fname:
                out.append(("matching", name, data))
            elif "flash" in lname or "card" in lname or "flash" in fname:
                out.append(("flashcards", name, data))
            else:
                notes.append(f"ambiguous term/definition array {name}; defaulted to flashcards")
                out.append(("flashcards", name, data))
        elif "order" in keys and ({"name", "title", "label"} & keys):
            out.append(("sequencing", name, data))
    return out


def _label(row: dict[str, Any]) -> str:
    return str(row.get("name") or row.get("title") or row.get("label") or "").strip()


def _pair(row: dict[str, Any]) -> dict[str, str]:
    term = str(row.get("term") or row.get("name") or "").strip()
    definition = str(row.get("definition") or row.get("description") or "").strip()
    return {"term": term, "definition": definition}


def convert_quiz(data: list[dict[str, Any]], *, slug: str, title: str, notes: list[str]) -> dict[str, Any]:
    questions = []
    for n, row in enumerate(data, start=1):
        options = [str(o) for o in row["options"]]
        answer_text = str(row["answer"])
        if answer_text in options:
            answer = options.index(answer_text)
        else:
            answer = 0
            notes.append(f"no correct answer for question {n} ({answer_text!r} not an option)")
        questions.append({
            "stem": str(row["question"]).strip(),
            "options": options,
            "answer": answer,
            "explanation": (str(row["explanation"]).strip() or None) if row.get("explanation") else None,
            "outcomes": [str(c) for c in row.get("competencies", [])]
                        or ([str(row["outcomeCode"])] if row.get("outcomeCode") else []),
        })
    return {"quiz": {"slug": slug, "title": title, "pass_percent": 80, "shuffle": True,
                      "questions": questions}}


def convert_flashcards(data: list[dict[str, Any]], *, slug: str, title: str, notes: list[str]) -> dict[str, Any]:
    cards = [_pair(row) for row in data]
    for card in cards:
        if not card["term"] or not card["definition"]:
            notes.append(f"empty term/definition in {slug}")
    return {"flashcards": {"slug": slug, "title": title,
                            "cards": [c for c in cards if c["term"] and c["definition"]]}}
```

- [ ] **Step 6: Build the two golden fixture pages** — copy a real legacy quiz block (`Radiation_Biology/Radiation_Effects/index.html`'s `quizData`, first 3 questions) and a real flashcard block (`Orientation_to_Radiation_Therapy/What_is_Oncology/oncology_flashcards_activity.html`'s `flashcardData`, first 4 cards) into minimal fixture HTML files, and add one end-to-end test per fixture asserting the exact converted document (golden dict inline in the test). The legacy repo is read-only — copy, never move.

- [ ] **Step 7: Gates (`uv run ruff check . && uv run mypy . && uv run pytest -q …exit=$?`); commit**

```bash
git add tools/migrate-legacy && git commit -m "feat(tools): JS array extractor and quiz/flashcards converters"
```

### Task 7: migrate-legacy — matching/sequencing converters + whole-repo `scan` command

**Files:**
- Modify: `tools/migrate-legacy/src/migrate_legacy/activities.py` (add `convert_matching`, `convert_sequencing`)
- Create: `tools/migrate-legacy/src/migrate_legacy/scan.py`
- Modify: `tools/migrate-legacy/src/migrate_legacy/cli.py` (add the `scan` subcommand)
- Test: `tools/migrate-legacy/tests/test_scan.py` (+ extend `test_activities.py`)
- Fixtures: `tools/migrate-legacy/tests/fixtures/legacy_root/` — a miniature legacy tree: `Subject_A/Lesson_One/index.html` (a valid paged lesson with an embedded `matchingData`), `Subject_A/Lesson_One/one_flashcards_activity.html`, `Subject_B/Quiz_Thing/index.html` (quiz array, no lesson pages), `Subject_B/Weird/index.html` (radio+`correctAnswers` page → unsupported)

**Interfaces:**
- Consumes: Task 6's `js_arrays`/`classify_arrays`/converters; existing `convert_lesson`.
- Produces (used by Task 8): `scan.scan_tree(root: Path, out: Path, subjects: list[str] | None) -> list[dict]` — walks each top-level subject directory, converts every `.html` file, writes `out/<subject-slug>/<doc-slug>.json` documents, returns report entries `{"page": str, "kind": str, "status": "converted|needs-review|unsupported", "notes": [str]}`; CLI `migrate-legacy scan ROOT --out DIR [--report FILE] [--subjects NAME…]`.

**Scan rules (write these as code comments too):**
1. Subject = the top-level directory name; the scanner **overrides** each document's `subject` to `{"slug": slugify(top), "title": top.replace("_", " "), "order": <index in the sorted subject list>}` — nested dirs (e.g. `Ethics/HIPAA/hipaa_quiz`) must not become subjects.
2. For each `.html` file: if it matches the paged-lesson pattern, run `convert_lesson` (lesson doc + report); **additionally** run `js_arrays` + `classify_arrays` on the same file — legacy lesson pages embed quiz/matching arrays that become separate sibling activities.
3. Non-lesson `.html` files with no classifiable arrays report `unsupported` (with the extractor's notes) and write nothing. Directories named `apps`, `assets`, `shared`, `examples`, `rtt_e_workbook`, `simulated_radiation_center` are never scanned.
4. Activity slugs: for arrays in `X/index.html` → `f"{slugify(X)}-{kind}"`; for `*_activity.html` files → `slugify(filename stem)`. Activity titles: `f"{page_title}: {kind.title()}"` where page title comes from the file's `<h1>` (fallback: directory name). Multiple arrays of the same kind in one file: suffix `-2`, `-3` in document order with a needs-review note.
5. Slug collisions across the whole scan (lesson or activity): the first keeps the plain slug; later ones get `f"{subject_slug}-{slug}"` and a needs-review note.
6. `convert_matching`: pairs via `_pair`; **duplicate definitions** → drop the duplicate pair + needs-review note (the importer rejects them hard). `present_n`: null (legacy pages present all pairs from these arrays). `convert_sequencing`: sort rows by their `order` key, items `[{"label": _label(row), **({"detail": str(row["description"]).strip()} if row.get("description") else {})}]`; rows missing `order` → needs-review, document order kept.
7. A document's report status: `needs-review` if any note was recorded for it, else `converted`; a file yielding no documents at all: `unsupported`.

- [ ] **Step 1: Failing scan test**

`tests/test_scan.py` builds expectations against the fixture tree:

```python
import json
from pathlib import Path

from migrate_legacy.scan import scan_tree

FIXTURE_ROOT = Path(__file__).parent / "fixtures/legacy_root"


def test_scan_tree_writes_docs_and_reports(tmp_path: Path) -> None:
    reports = scan_tree(FIXTURE_ROOT, tmp_path, subjects=None)
    by_page = {(r["page"], r["kind"]): r for r in reports}
    # Lesson + its embedded matching + the sibling flashcards file, under subject-a.
    assert (tmp_path / "subject-a/lesson-one.json").exists()
    assert (tmp_path / "subject-a/lesson-one-matching.json").exists()
    assert (tmp_path / "subject-a/one-flashcards-activity.json").exists()
    # The standalone quiz page under subject-b.
    quiz = json.loads((tmp_path / "subject-b/quiz-thing-quiz.json").read_text())
    assert quiz["subject"]["slug"] == "subject-b"      # scanner-injected subject
    assert quiz["quiz"]["questions"][0]["answer"] in (0, 1)
    # The radio/correctAnswers page is unsupported, with a note, and wrote nothing.
    unsupported = [r for r in reports if r["status"] == "unsupported"]
    assert any("Weird" in r["page"] for r in unsupported)


def test_scan_is_deterministic(tmp_path: Path) -> None:
    a = scan_tree(FIXTURE_ROOT, tmp_path / "a", subjects=None)
    b = scan_tree(FIXTURE_ROOT, tmp_path / "b", subjects=None)
    assert a == b  # sorted walks; no set/dict iteration order leaks into output
```

- [ ] **Step 2: Implement** `convert_matching`/`convert_sequencing` per rule 6, then `scan.py` per rules 1–7 (pure function of paths; all filesystem walking via `sorted(...)`), then the `scan` subcommand in `cli.py` (args per the interface; prints one line per written document, a final `converted/needs-review/unsupported` count summary, exit 0 always — `scan` is an inventory, not a gate).

- [ ] **Step 3: Gates; commit**

```bash
git add tools/migrate-legacy && git commit -m "feat(tools): matching/sequencing converters and whole-repo scan command"
```

### Task 8: Migrate all legacy subjects; seed the content + demo quiz

**Files:**
- Create (generated): `apps/api/seed/content/**/*.json` — the committed output of `scan` over the real legacy repo
- Create: `docs/legacy-migration-report.md` (the fix-list for plan 3b)
- Create: `apps/api/seed/activities/demo-quiz.json`
- Modify: `apps/api/app/seed.py` (import `seed/content/**` and `seed/activities/**`; quiz attempts for the ten demo students)
- Test: `apps/api/tests/test_seed.py` (extend)

**Interfaces:**
- Consumes: Tasks 3, 6, 7.
- Produces: seeded DB where the ten demo students each also have one submitted attempt on the demo quiz (deterministic spread, below); `SeedSummary` gains `activities_imported: int` and `quiz_attempts_created: int`.

- [ ] **Step 1: Run the scan over the real legacy repo** (read-only source; output into the API seed tree):

```bash
cd tools/migrate-legacy
uv run migrate-legacy scan /Users/christopherguzman/Desktop/coding_projects/rt-app/rtt_e_workbook \
  --out ../../apps/api/seed/content --report /tmp/legacy-scan-report.json
```

Then validate every emitted document through the real importer against the local test DB (catches converter/importer contract drift immediately):

```bash
cd ../../apps/api
TEST_DATABASE_URL=... uv run python - <<'EOF'
# Validation-only pass: model_validate every seed/content doc; print failures.
import json, pathlib, sys
from app.content.activity_importer import _IMPORTERS
bad = 0
for p in sorted(pathlib.Path("seed/content").rglob("*.json")):
    data = json.loads(p.read_text())
    kind = next(k for k in _IMPORTERS if k in data)
    model, _ = _IMPORTERS[kind]
    try:
        model.model_validate(data)
    except Exception as e:  # noqa: BLE001
        bad += 1
        print(f"INVALID {p}: {e}")
sys.exit(1 if bad else 0)
EOF
```

Any `INVALID` document means a converter bug: fix the converter (Task 6/7 code), re-run the scan, and re-validate — do **not** hand-edit generated JSON.

- [ ] **Step 2: Write `docs/legacy-migration-report.md`** from `/tmp/legacy-scan-report.json`: a summary table (per subject: converted / needs-review / unsupported counts per kind) followed by the full needs-review and unsupported listings with their notes. State at the top: "This is plan 3b's authoring fix-list; `unsupported` pages (games, simulators, EMR, radio-quiz variants) are phase-4 or fix-list material."

- [ ] **Step 3: The demo quiz fixture** `apps/api/seed/activities/demo-quiz.json` — deterministic, outcome-tagged, 4 single-choice questions (answers at indices 0, 1, 2, 0; outcomes `["RB-1"]`, `["RB-1"]`, `["RB-2"]`, `["RB-2"]`; subject `radiation-biology`; slug `demo-quiz`; title `Demo quiz`; pass_percent 80). Write the complete JSON file (10–15 lines per question; stems "Demo question N?" with options "Option A…D").

- [ ] **Step 4: Extend `seed.py`** — after the existing lesson import loop:

```python
    activities_imported = 0
    # Migrated legacy content + hand-written activity fixtures, both idempotent upserts.
    for directory in (CONTENT_DIR, ACTIVITY_DIR):
        for path in sorted(directory.rglob("*.json")):
            await import_any(db, json.loads(path.read_text()))
            activities_imported += 1
```

with `CONTENT_DIR = Path(__file__).resolve().parents[1] / "seed/content"` and `ACTIVITY_DIR = .../ "seed/activities"`. Then, mirroring the existing lesson-attempt block: each demo student `i` gets one submitted attempt on the `demo-quiz` activity answering `i % 5` of its 4 questions correctly (grade via `gradeable_items` on the current snapshot, items sorted by key; rollup through `upsert_activity_result`; skip when the student already has an attempt on it). Update `SeedSummary` + the CLI print.

- [ ] **Step 5: Extend `test_seed.py`**: re-run idempotency now also asserts activity counts stable across two `seed()` calls; the demo quiz exists, is published, has 4 questions and outcome tags; student01's quiz rollup exists with the expected percent (1 of 4 = 25.0).

- [ ] **Step 6: Full API gate** (note: `test_seed` now imports the whole migrated corpus — if the suite time grows past ~3 minutes, flag it in your report rather than trimming content). Commit in two pieces so the generated bulk stays out of the hand-written diff:

```bash
git add apps/api/seed/content && git commit -m "feat(content): migrated legacy content for all subjects (generated by migrate-legacy scan)"
git add apps/api docs/legacy-migration-report.md && git commit -m "feat(api): seed migrated content, demo quiz with outcomes, quiz attempts"
```

### Task 9: Educator analytics — activity stats and outcome mastery (FR-E-06/07)

**Files:**
- Modify: `apps/api/app/analytics/schemas.py`, `queries.py`, `router.py`
- Test: `apps/api/tests/test_analytics.py` (extend)
- Regenerate: `make client`

**Interfaces:**
- Consumes: Task 2 `item_labels`/`gradeable_items`; Task 1 `Outcome`/`QuestionOutcome`; existing `require_cohort_educator`, `record_audit`, `_cohort_students`.
- Produces (used by Tasks 10, 15):
  - `GET /api/v1/cohorts/{cohort_id}/activities/{activity_id}` → `ActivityStatsOut {activity_id, title, kind, attempts: int, students_attempted: int, pass_rate: float | None, distribution: list[BucketOut {label: str, count: int}], items: list[ItemStatOut {key, label, answered: int, correct: int, percent_correct: float | None, top_wrong: list[WrongOut {option: str, count: int}]}]}`. Audited `read_activity_stats` (target the activity, cohort_id set). Unknown/unpublished activity → 404 `"Activity not found"` (no audit row on 403/404 — same rule the existing views test).
  - `GET /api/v1/cohorts/{cohort_id}/outcomes` → `OutcomeMasteryOut {outcomes: list[OutcomeRowOut {code, title, questions: int, answered: int, percent_correct: float | None, students_below_threshold: int, students: list[OutcomeStudentOut {user_id, display_name, answered: int, percent_correct: float | None}]}]}`. Audited `read_outcomes`.
- Query semantics: only **submitted** attempts of the cohort's **students**; distribution buckets `0–49 / 50–69 / 70–79 / 80–89 / 90–100` on `attempt.percent` (flashcards' null percents excluded); per-item stats aggregate `attempt_item` rows joined through those attempts; labels/options resolve from the activity's **current** snapshot via `item_labels`/`gradeable_items` (keys absent from the current snapshot — old republished versions — keep the key itself as the label, empty options); `top_wrong` = up to 2 most-frequent incorrect `response["choice"]` values mapped to option text (skip out-of-range/malformed choices). Outcome mastery joins `question_outcome → question` and matches `attempt_item.item_key == str(question.id)` (quiz items only, per the documented limitation); per-student `percent_correct` = correct/answered over that student's items; `students_below_threshold` counts students with `answered > 0` and `percent_correct < cohort.threshold_percent`.

- [ ] **Step 1: Failing tests** (extend `test_analytics.py`; reuse its existing helpers plus `make_educator`/`create_cohort` from `tests.test_cohorts` and `import_any` + `QUIZ_DOC` from `tests.test_activity_importer`). Build: an educator with a cohort; two enrolled students; both submit attempts on the imported quiz through the real endpoints (student A both correct → 100, student B one of two → 50, wrong answer `choice=2` on q1). Assert:

```python
async def test_activity_stats_math(client, db) -> None:
    ...  # setup as above
    r = await client.get(f"/api/v1/cohorts/{cohort_id}/activities/{activity.id}")
    body = r.json()
    assert body["attempts"] == 2 and body["students_attempted"] == 2
    assert body["pass_rate"] == 50.0
    assert [b["count"] for b in body["distribution"]] == [0, 1, 0, 0, 1]
    q1 = next(i for i in body["items"] if i["key"] == q1_key)
    assert (q1["answered"], q1["correct"]) == (2, 1) and q1["percent_correct"] == 50.0
    assert q1["top_wrong"] == [{"option": "C", "count": 1}]
    # Audited with the cohort id attached.
    row = await db.scalar(select(AuditLog).where(AuditLog.action == "read_activity_stats"))
    assert row is not None and row.cohort_id == cohort_uuid


async def test_activity_stats_404_and_no_audit_for_unknown_activity(client, db) -> None: ...
async def test_other_educator_gets_403(client, db) -> None: ...  # same pattern as existing tests


async def test_outcome_mastery(client, db) -> None:
    ...  # same setup: A answers both correctly, B only q2 (q1 wrong).
    r = await client.get(f"/api/v1/cohorts/{cohort_id}/outcomes")
    rows = {o["code"]: o for o in r.json()["outcomes"]}
    # RB-1 tags q1+q2: 4 answers, 3 correct (A:2, B:1); B is at 50% < threshold 70.
    assert rows["RB-1"]["questions"] == 2
    assert (rows["RB-1"]["answered"], rows["RB-1"]["percent_correct"]) == (4, 75.0)
    assert rows["RB-1"]["students_below_threshold"] == 1
    by_user = {s["display_name"]: s for s in rows["RB-1"]["students"]}
    assert by_user["Student A"]["percent_correct"] == 100.0
    assert by_user["Student B"]["percent_correct"] == 50.0
    # RB-2 tags only q2: both students answered it correctly.
    assert (rows["RB-2"]["answered"], rows["RB-2"]["percent_correct"]) == (2, 100.0)
    assert rows["RB-2"]["students_below_threshold"] == 0
    row = await db.scalar(select(AuditLog).where(AuditLog.action == "read_outcomes"))
    assert row is not None
```

(Hand-computed numbers, not recomputed from the implementation's own math.)

- [ ] **Step 2: Implement** — new query functions in `queries.py` (`activity_stats(db, cohort, activity)`, `outcome_rows(db, cohort)`), schemas per the interface block, two thin read-authorize-audit routes in `router.py` following `cohort_overview`'s exact shape (`require_cohort_educator` dependency; audit + `db.commit()` after building the response). Keep aggregation in SQL where it's one grouped query (`attempt` counts, item correct/answered counts) and in Python where it needs the snapshot (labels, wrong-option mapping) — the same split `activity_rows` already uses.

- [ ] **Step 3: Full gate; `make client`; commit**

```bash
git add apps/api packages/api-client && git commit -m "feat(api): per-activity stats and outcome mastery for educators"
```

### Task 10: CSV export (FR-E-08)

**Files:**
- Create: `apps/api/app/analytics/csv_export.py`
- Modify: `apps/api/app/analytics/router.py` (three `.csv` routes)
- Test: `apps/api/tests/test_csv_export.py`
- Regenerate: `make client`

**Interfaces:**
- Consumes: Task 9's query functions + existing `student_rows`.
- Produces: `csv_response(filename: str, header: list[str], rows: Iterable[Sequence[object]]) -> Response` (UTF-8 `text/csv`, `Content-Disposition: attachment; filename="…"`, `csv.writer` semantics, `None` rendered as empty); routes `GET /cohorts/{id}/overview.csv`, `GET /cohorts/{id}/activities/{aid}.csv`, `GET /cohorts/{id}/outcomes.csv` — each audited as `export_csv` with `detail={"view": "overview" | "activity" | "outcomes"}` (plus `"activity_id"` for the activity view).

**Column contract (FR-E-08: nothing beyond the on-screen view):**
- overview.csv: `display_name,email,attempted,passed,mean_best_percent` — one row per student, same order as the overview.
- activities/{aid}.csv: `item,label,answered,correct,percent_correct` — one row per item.
- outcomes.csv: `outcome,title,questions,answered,percent_correct,students_below_threshold` — one row per outcome.

- [ ] **Step 1: Failing tests** — reuse Task 9's setup helper; assert for each route: status 200, `content-type` starts `text/csv`, first line equals the exact header above, row count and one spot-checked row match the JSON view, an `export_csv` audit row with the right `detail["view"]` exists, and a non-owner educator gets 403 with no audit row. Also a unit test for `csv_response` quoting (a display name containing `", commas"` survives a `csv.reader` round trip).

- [ ] **Step 2: Implement** `csv_export.py`:

```python
import csv
import io
from collections.abc import Iterable, Sequence

from fastapi import Response


def csv_response(filename: str, header: list[str], rows: Iterable[Sequence[object]]) -> Response:
    """One CSV attachment: UTF-8, header row first, None rendered as empty string."""
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(header)
    for row in rows:
        writer.writerow(["" if v is None else v for v in row])
    return Response(
        content=buf.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
```

and the three routes in `router.py`, each: `require_cohort_educator` → call the same query the JSON view uses → map to the exact columns above → `record_audit(..., action="export_csv", ...)` → `db.commit()` → return `csv_response`. FastAPI note: declare them with `response_class=Response` and no `response_model` (raw CSV bypasses the JSON schema; the generated client just types them as untyped responses).

- [ ] **Step 3: Full gate; `make client`; commit**

```bash
git add apps/api packages/api-client && git commit -m "feat(api): CSV export for overview, activity stats, and outcomes"
```

### Task 11: Rate limiting (NFR-13, issue #29)

**Files:**
- Create: `apps/api/app/ratelimit.py`
- Modify: `apps/api/app/config.py` (`rate_limit_enabled: bool = True`)
- Modify: `apps/api/app/auth/router.py` (login, register), `apps/api/app/cohorts/router.py` (join)
- Modify: `apps/api/tests/conftest.py` (test `Settings` set `rate_limit_enabled=False`)
- Test: `apps/api/tests/test_ratelimit.py`

**Interfaces:**
- Produces: `rate_limit(name: str, *, limit: int = 10, window_s: float = 60.0) -> Callable` — a FastAPI dependency factory; per `(name, client-ip)` token bucket in process memory (single-process prod API per ADR-0005 — say so in the header comment, and that multi-process deployment would need a shared store); over limit → `Problem(429, "Too many requests")`. `reset() -> None` clears all buckets (tests). Disabled entirely when `settings.rate_limit_enabled` is false.

- [ ] **Step 1: Failing tests** — `test_ratelimit.py` builds its own client (the `client_google` pattern) with `rate_limit_enabled=True`:

```python
async def test_login_rate_limited_per_ip(...) -> None:
    # 10 wrong-password logins succeed in returning 401; the 11th is 429 problem+json.
    for _ in range(10):
        r = await limited_client.post("/api/v1/auth/login", json=BAD_LOGIN)
        assert r.status_code == 401
    r = await limited_client.post("/api/v1/auth/login", json=BAD_LOGIN)
    assert r.status_code == 429
    assert r.headers["content-type"].startswith("application/problem+json")


async def test_limits_are_per_ip(...) -> None:
    # A different X-Forwarded-For gets a fresh bucket (client_ip honours the first hop).
    ...

async def test_join_endpoint_limited(...) -> None: ...
async def test_disabled_in_test_settings(client, db) -> None:
    # The shared `client` fixture (rate_limit_enabled=False) never 429s in 15 tries.
    ...
```

Add a module-level autouse fixture calling `app.ratelimit.reset()` before each test in this file.

- [ ] **Step 2: Implement** — token bucket on `time.monotonic()` (`tokens = min(limit, tokens + elapsed * limit / window_s)`; consume 1 or raise); key ip via the existing `app.audit.service.client_ip(request)` (`"unknown"` fallback); read settings via `app.config.get_settings(request)`; module-level dependency singletons at each router (`_login_limit = rate_limit("login")` etc., applied as route-decorator `dependencies=[Depends(_login_limit)]` — the ruff B008 pattern already used for `_require_admin`). Endpoints: `login`, `register`, `join` (10/min each). NFR-13 also names password reset — no such endpoint exists yet; note that in the module header.

- [ ] **Step 3: Full gate (the whole suite must stay green — the shared fixture disables limiting); commit**

```bash
git add apps/api && git commit -m "feat(api): per-IP rate limiting on login, register, and cohort join (NFR-13)"
```

### Task 12: Admin hardening — last-admin guard, ILIKE escaping, erase (issue #30, FR-M-03)

**Files:**
- Modify: `apps/api/app/admin/router.py`, `apps/api/app/admin/schemas.py`
- Test: `apps/api/tests/test_admin.py` (extend)
- Regenerate: `make client`

**Interfaces:**
- Produces: `POST /api/v1/admin/users/{user_id}/erase` → `AdminUserOut`; guards on `change_role`/`deactivate_user`/`erase_user`; escaped search in `list_users`.

**Behavior (FR-M-03 verbatim + guards):**
- `_escape_like(q: str) -> str`: escape `\`, `%`, `_`; use `.ilike(pattern, escape="\\")` in `list_users`.
- `_is_last_active_admin(db, target) -> bool`: target is an active (`deactivated_at IS NULL`) admin and the count of active admins is 1.
- `change_role` demoting the last active admin → `Problem(409, "Cannot demote the last admin")`; `deactivate_user` → `409 "Cannot deactivate the last admin"`; `erase` → `409 "Cannot erase the last admin"`.
- `erase_user`: via `_target` (404 unknown / 400 self); idempotent (an already-erased user — email starts `erased-` — returns unchanged, no second audit row, mirroring re-deactivation); otherwise: `display_name = "Erased user"`, `email = f"erased-{target.id}@erased.invalid"`, `password_hash = None`, `deactivated_at` set if null, **delete** all `Session` and `Identity` rows for the user (`sqlalchemy.delete`), attempts/rollups untouched; audit `erase_user` with `detail={"sessions_deleted": n, "identities_deleted": m}`; commit. (`Identity` lives in `app.auth.models` — confirm the class name there before importing.)

- [ ] **Step 1: Failing tests** — extend `test_admin.py` (it already has admin-login helpers): last-admin 409 on all three routes; a second admin makes demotion legal again; erase tombstones PII, kills sessions (the erased user's old cookie gets 401), deletes identities, keeps the user's `activity_result` rows, writes one audit row, and a repeat erase changes nothing and adds no audit row; `list_users?q=100%` matches only a literal `100%` display name, not everything (seed one user `pct` named `100% done` and one named `100x done`).

- [ ] **Step 2: Implement per the behavior block; full gate; `make client`; commit**

```bash
git add apps/api packages/api-client && git commit -m "feat(api): last-admin guard, ILIKE escaping, and FR-M-03 erase endpoint"
```

### Task 13: Operations — session purge, Sentry, prod env placeholders

**Files:**
- Create: `apps/api/app/tasks/__init__.py` (package docstring: reserved background-task slot, first occupant), `apps/api/app/tasks/purge_sessions.py`
- Modify: `apps/api/app/config.py` (`sentry_dsn: str = ""`), `apps/api/app/main.py` (guarded `sentry_sdk.init`), `apps/api/pyproject.toml` (`uv add sentry-sdk`)
- Modify: `apps/web/src/hooks.server.ts` (guarded Sentry init + `handleError`), `apps/web/package.json` (`pnpm --filter web add @sentry/sveltekit`)
- Modify: `infra/prod.env.example` (add `SENTRY_DSN=` placeholder with comment, both api and web sections as the file is organized)
- Test: `apps/api/tests/test_purge_sessions.py`

**Interfaces:**
- Produces: `async purge_expired_sessions(db) -> int` — deletes `session` rows with `expires_at < now - PURGE_AFTER_DAYS` (constant `PURGE_AFTER_DAYS = 30`, NFR-26), returns the count; `main()` CLI (`python -m app.tasks.purge_sessions`, same engine/commit shape as `app.seed.main`). Ops wiring is documentation only (Task 17 adds the VM crontab line to docs/06) — **no** duplicate SQL in `infra/backup/backup.sh`.

- [ ] **Step 1: Failing test** — create three sessions directly (`app.auth.models.Session`): expired 31 days ago, expired 1 day ago, live; `purge_expired_sessions` returns 1 and only the 31-day one is gone.
- [ ] **Step 2: Implement**:

```python
PURGE_AFTER_DAYS = 30  # NFR-26: sessions purged 30 days after expiry


async def purge_expired_sessions(db: AsyncSession) -> int:
    """Delete sessions whose expiry is more than PURGE_AFTER_DAYS in the past."""
    cutoff = datetime.now(UTC) - timedelta(days=PURGE_AFTER_DAYS)
    result = await db.execute(delete(Session).where(Session.expires_at < cutoff))
    return int(result.rowcount or 0)
```

- [ ] **Step 3: Sentry** — api: in `create_app`, before building the FastAPI app: `if settings.sentry_dsn: sentry_sdk.init(dsn=settings.sentry_dsn, environment=settings.env)` (no traces sampling — errors only). Web (`hooks.server.ts`): when `env.SENTRY_DSN` is set, `Sentry.init({ dsn: env.SENTRY_DSN })` at module load and wrap/emit in the existing `handleError` hook via `Sentry.captureException`; when unset, everything is a no-op (a comment records that client-side Sentry is deliberately deferred). Run `svelte-check`/vitest to confirm nothing regresses.
- [ ] **Step 4: Full API gate + `pnpm --filter web check && pnpm --filter web test`; commit**

```bash
git add apps/api apps/web infra/prod.env.example && git commit -m "feat(ops): session purge job and opt-in Sentry error tracking"
```

### Task 14: Web — activity page, Quiz and Flashcard players, subject activity lists

**Files:**
- Create: `apps/web/src/lib/activity/types.ts`, `apps/web/src/lib/activity/attempts.ts`, `apps/web/src/lib/activity/QuizPlayer.svelte`, `apps/web/src/lib/activity/FlashcardPlayer.svelte`
- Create: `apps/web/src/routes/(app)/subjects/[slug]/activities/[id]/+page.server.ts`, `+page.svelte`
- Modify: `apps/web/src/routes/(app)/subjects/[slug]/+page.svelte` (activity links), `apps/web/src/routes/(app)/subjects/+page.svelte` (show activity_count)
- Test: `apps/web/src/lib/activity/QuizPlayer.svelte.spec.ts`, `attempts.test.ts`

**Prerequisite:** Tasks 4/5/9/10 are merged into the branch and `make client` has been run (the generated client must know `GET /activities/{id}`, `AttemptOut.items`, etc.). Mirror the existing `KnowledgeCheck.svelte` / `LessonPager.svelte` for the openapi-fetch call pattern (`$lib/lesson/api`'s `api` client, injectable `post` prop for tests), `ProseDoc.svelte` for stems, and the repo's plain-HTML styling.

**Interfaces:**
- `types.ts`: hand-written mirrors of the stripped snapshot shapes (like `lib/lesson/types.ts`): `QuizSnapshot`, `FlashcardsSnapshot`, `MatchingSnapshot` (terms + definitions arrays), `SequencingSnapshot`, discriminated `ActivitySnapshot` on `activity.kind`, plus `activitySnapshot(raw: unknown): ActivitySnapshot` (the one boundary cast).
- `attempts.ts` (shared by all players, pure + client-injectable, vitest-covered):

```typescript
export type StartedAttempt = { id: string; items: SavedItem[] };
export type SavedItem = { item_key: string; response: { choice: number }; correct: boolean | null };
/** POST /activities/{id}/attempts — the API resumes an in-progress attempt (items included). */
export async function startAttempt(post: PostFn, activityId: string): Promise<StartedAttempt>;
/** POST /attempts/{id}/items — grade one choice; returns correct + optional explanation. */
export async function gradeItem(post: PostFn, attemptId: string, itemKey: string, choice: number): Promise<ItemGrade>;
/** POST /attempts/{id}/submit with a fresh crypto.randomUUID() Idempotency-Key. */
export async function submitAttempt(post: PostFn, attemptId: string): Promise<SubmittedAttempt>;
```

- [ ] **Step 1: The route.** `+page.server.ts` — `apiFetch(event, `/activities/${event.params.id}`)`; 404 → `error(404, 'Activity not found')`, other non-2xx → `error(502, …)`; return `{ activity }`. `+page.svelte` — `{#if data.activity.kind === 'quiz'} <QuizPlayer …/> {:else if … 'flashcards'} … {:else}` fallback paragraph "This activity type arrives in a later phase." (matching/sequencing land in Task 15 — wire their branches then).

- [ ] **Step 2: QuizPlayer** (complete behavior; presentation mirrors `KnowledgeCheck.svelte`):

```svelte
<script lang="ts">
	import ProseDoc from '$lib/prose/ProseDoc.svelte';
	import { api } from '$lib/lesson/api';
	import { gradeItem, startAttempt, submitAttempt } from '$lib/activity/attempts';
	import type { QuizSnapshot } from '$lib/activity/types';

	let { activityId, snapshot, post = api.POST }: {
		activityId: string; snapshot: QuizSnapshot; post?: typeof api.POST;
	} = $props();

	const questions = snapshot.quiz.questions;
	let attemptId = $state<string | null>(null);
	// item_key -> {choice, correct, explanation}: rehydrated from the resumed attempt.
	let answers = $state<Record<string, { choice: number; correct: boolean | null; explanation?: unknown }>>({});
	let index = $state(0);
	let result = $state<{ percent: number | null; passed: boolean | null } | null>(null);
	let busy = $state(false);

	// Start (or resume) the attempt once; jump to the first unanswered question.
	$effect(() => {
		startAttempt(post, activityId).then((a) => {
			attemptId = a.id;
			for (const item of a.items) answers[item.item_key] = { choice: item.response.choice, correct: item.correct };
			// Resume at the first unanswered question (or the last one when all are answered).
			const firstUnanswered = questions.findIndex((q) => !answers[q.key]);
			index = firstUnanswered === -1 ? questions.length - 1 : firstUnanswered;
		});
	});

	async function choose(key: string, choice: number) {
		if (!attemptId || answers[key] || busy) return;
		busy = true;
		const grade = await gradeItem(post, attemptId, key, choice);
		answers[key] = { choice, correct: grade.correct, explanation: grade.explanation };
		busy = false;
	}

	async function finish() {
		if (!attemptId || busy) return;
		busy = true;
		const submitted = await submitAttempt(post, attemptId);
		result = { percent: submitted.percent, passed: submitted.passed };
		busy = false;
	}

	const answered = $derived(Object.keys(answers).length);
</script>

{#if result}
	<section aria-live="polite" data-testid="quiz-result">
		{#if result.passed}<p class="badge" data-testid="quiz-badge">🏅 Badge earned!</p>{/if}
		<p>Score: {result.percent ?? 0}%</p>
	</section>
{:else if questions[index]}
	{@const q = questions[index]}
	<section data-testid="quiz-question">
		<p>Question {index + 1} of {questions.length}</p>
		<ProseDoc doc={q.stem} />
		{#each q.body.options as option, i (i)}
			<label>
				<input type="radio" name={q.key} value={i} disabled={!!answers[q.key] || busy}
					checked={answers[q.key]?.choice === i} onchange={() => choose(q.key, i)} />
				{option}
			</label>
		{/each}
		{#if answers[q.key]}
			<p data-testid="feedback">{answers[q.key].correct ? 'Correct!' : 'Not quite.'}</p>
			{#if answers[q.key].explanation}<ProseDoc doc={answers[q.key].explanation} />{/if}
			{#if index < questions.length - 1}
				<button onclick={() => (index += 1)}>Next question</button>
			{:else}
				<button onclick={finish} disabled={answered < questions.length}>Finish quiz</button>
			{/if}
		{/if}
	</section>
{/if}
```

- [ ] **Step 3: FlashcardPlayer** — `cards` from the snapshot; `index`/`flipped` state; Previous/Flip/Next buttons; card front shows `term`, clicking Flip reveals `definition`; on the last card a "Finish deck" button runs `startAttempt` then `submitAttempt` immediately and shows "Deck complete" (`aria-live="polite"`, `data-testid="deck-complete"`).

- [ ] **Step 4: Subject page links** — in `subjects/[slug]/+page.svelte`, under the lesson list, a section per non-empty kind group (`Quizzes`, `Flashcards`, `Matching`, `Sequencing`) with links `resolve('/(app)/subjects/[slug]/activities/[id]', { slug: data.subject.slug, id: activity.id })`. In `subjects/+page.svelte`, show `({subject.activity_count} activities)` beside each subject.

- [ ] **Step 5: Tests** — `attempts.test.ts`: stub `post` verifying paths/bodies/Idempotency-Key header presence; `QuizPlayer.svelte.spec.ts` (browser project, mirroring `KnowledgeCheck.svelte.spec.ts`'s stub-post pattern): renders question 1, answering shows feedback + explanation, finishing shows the badge on `passed: true`, and a resumed attempt (stub returns saved items) starts on the first unanswered question.

- [ ] **Step 6: Gates; commit**

Run: `pnpm --filter web lint && pnpm --filter web check && pnpm --filter web test`

```bash
git add apps/web && git commit -m "feat(web): activity page with quiz and flashcard players"
```

### Task 15: Web — Matching/Sequencing players, educator stats + outcomes pages, CSV links

**Files:**
- Create: `apps/web/src/lib/activity/MatchingPlayer.svelte`, `SequencingPlayer.svelte`
- Modify: `apps/web/src/routes/(app)/subjects/[slug]/activities/[id]/+page.svelte` (wire the two new branches)
- Create: `apps/web/src/routes/(app)/educator/cohorts/[id]/activities/[aid]/+page.server.ts`, `+page.svelte`
- Create: `apps/web/src/routes/(app)/educator/cohorts/[id]/outcomes/+page.server.ts`, `+page.svelte`
- Modify: `apps/web/src/routes/(app)/educator/cohorts/[id]/+page.svelte` (per-activity "Stats" links, "Outcomes" link, "Download CSV" link)
- Test: `MatchingPlayer.svelte.spec.ts`, `SequencingPlayer.svelte.spec.ts`

**Player behavior (both click-based — Global Constraints):**
- **MatchingPlayer:** two columns — terms (stored order) and definitions (the server's alphabetical order, positions = grading indices). Click a term to select it (aria-pressed), then click a definition to pair; a pairing immediately `gradeItem(post, attemptId, termKey, definitionIndex)` and shows ✓/✗ beside the term; re-pairing an already-answered term is allowed until submit (upsert semantics). "Check results" button (enabled when every term is paired) submits and shows `Score: {percent}%` + passed state.
- **SequencingPlayer:** the served (label-sorted) items as an ordered list with per-row "Move up"/"Move down" buttons (aria-labels include the item label); "Check order" grades every item as `{choice: currentIndex}` then submits, then shows the score and marks each row ✓/✗ from the grade responses.
- Both call `startAttempt` on mount like QuizPlayer (resume tolerated; saved matching items re-mark their terms).

- [ ] **Step 1: Implement both players + wire the page branches** (reuse `attempts.ts`; markup/style mirroring QuizPlayer; specs stub `post` and assert: pairing flow produces a submit body sequence with the right item keys/choices; move-up reorders the rendered list; final score renders).

- [ ] **Step 2: Educator pages** — `activities/[aid]/+page.server.ts`: `apiFetch(event, `/cohorts/${id}/activities/${aid}`)` with the 403/404/502 mapping used by the existing cohort pages; page renders: summary line (attempts, students, pass rate), the distribution as a 5-row table, the items table (`label`, answered, correct, %, top wrong answers), and `<a href={`/api/v1/cohorts/${id}/activities/${aid}.csv`} data-testid="csv-link">Download CSV</a>` (a plain same-origin `<a>` — the session cookie rides along; **not** `resolve()`, it's an API URL, add the eslint disable comment the admin pages use for such links if the linter objects). `outcomes/+page.server.ts` + page: outcomes table with a `<details>` per outcome listing per-student rows; CSV link likewise. Overview page: each activity row gains a "Stats" link to `resolve('/(app)/educator/cohorts/[id]/activities/[aid]', …)`; header area gains "Outcomes" + "Download CSV" links.

- [ ] **Step 3: Gates; commit**

```bash
git add apps/web && git commit -m "feat(web): matching/sequencing players and educator stats, outcomes, CSV export"
```

### Task 16: Minor backlog from plan-2 reviews (issue #31)

**Files:** as listed per item. One task, one commit; each item is small and independent — fix exactly these, nothing adjacent:

**API**
- [ ] `app/attempts/rollup.py`: add `.options(noload(Attempt.items))` to the recompute query (`from sqlalchemy.orm import noload`) — the rollup never reads items; add a test pinning the tie-break when two attempts share `submitted_at` (id ascending wins as "latest").
- [ ] `app/cohorts/router.py` `list_my_cohorts`: replace the per-cohort COUNT with one grouped query (join `Enrollment`, `func.count` filtered by role student, `group_by(Cohort.id)`).
- [ ] `app/cohorts/router.py` `create_cohort`: don't generate a join code that `_assign_fresh_code` immediately replaces (construct with a placeholder assigned by `_assign_fresh_code` once).
- [ ] `app/seed.py`: replace the two bare `assert`s (missing seed lesson/version) with `RuntimeError` carrying the slug; add a partial-re-run test to `test_seed.py` (delete one demo student's attempt, re-run `seed()`, only that attempt is recreated).
- [ ] `alembic/versions/0005_cohorts_results_audit.py` docstring: expand to the standard header format used by 0003/0006; `app/attempts/rollup.py` header: complete the `Used by:` list.

**Web**
- [ ] Build `redirect()` targets via `resolve()`; unify nav route-id style to the group-prefixed form (`resolve('/(app)/…')`) everywhere.
- [ ] Extract the duplicated 403/404/502 response mapping in educator loads into `$lib/server/expect.ts` (`expectOk(res, notFoundMessage)` returning the parsed body or throwing the right `error()`), and use it in the loads Task 15 just added, too.
- [ ] Threshold form: guard `Number.parseInt` NaN → form fail(400) message.
- [ ] `problemOrNull` (in the educator actions helpers): make it actually return null on non-problem bodies (currently never null).
- [ ] Admin users page: build the query string with `URLSearchParams` instead of concatenation.
- [ ] E2E: extract the duplicated register-educator/register-student sequence into `e2e/helpers.ts` and use it from `lesson.e2e.ts`, `cohort.e2e.ts` (and Task 17's `quiz.e2e.ts`).

**Infra**
- [ ] `infra/compose.tunnel.yaml`: pin `cloudflared` to a version tag + digest (look up the current release; no `:latest`), add `logging` options and a basic healthcheck; add the same `logging` block to the `backup` service in `compose.prod.yaml`.
- [ ] `.github/workflows/main.yml`: move `packages: write` from workflow-level to the `images` job only.
- [ ] `infra/deploy/deploy.sh`: comment (not code) documenting that a failed one-shot migration intentionally leaves the old containers serving (the "rollback branch not reached" finding — behavior is correct; the comment records why).

- [ ] **Gates:** full API gate + `pnpm --filter web lint && check && test` + `docker compose -f infra/compose.prod.yaml config -q`. Commit:

```bash
git add -A && git commit -m "chore: minor backlog from plan-2 reviews (closes #31)"
```

### Task 17: E2E quiz flow, ADR-0006, documentation

**Files:**
- Create: `apps/web/e2e/quiz.e2e.ts`
- Create: `docs/adr/0006-practice-assessment-separation.md`
- Modify: `docs/02-requirements.md`, `docs/03-architecture.md`, `docs/05-setup.md`, `docs/06-operations.md`, `docs/adr/README.md`, `README.md`, `apps/api/app/main.py` (FastAPI `version="0.3.0"`)

- [ ] **Step 1: `quiz.e2e.ts`** (Playwright against the seeded compose stack, mirroring `cohort.e2e.ts`'s structure and using Task 16's `e2e/helpers.ts`):
  1. Register a fresh student; join `DEMO42`; navigate Subjects → Radiation Biology → Quizzes → **Demo quiz**.
  2. Answer all 4 questions choosing the first option each time (seeded answers are at indices 0,1,2,0, so choices 0,0,0,0 score 2 of 4 → expect the result screen with `Score: 50%` and no badge), asserting the per-question feedback text appears after each answer.
  3. Reload the page mid-quiz *before* finishing in a second scenario: answer 2 questions, reload, assert the player resumes at question 3 (resume path e2e-proven).
  4. Log in as the seeded educator; open Demo cohort → the Demo quiz row's "Stats" link; assert the items table shows 4 rows and the summary counts include the new student; fetch the `csv-link` href with `page.request.get` and assert status 200 + the exact header row from Task 10.
  Run: `pnpm --filter web e2e` against `make dev` + `make seed` (same as existing e2e).
- [ ] **Step 2: ADR-0006** (`docs/adr/` house style: Status/Context/Decision/Consequences): practice/assessment separation — one `access` column enforced by authorization at every student read, not obscurity; migrated legacy material is permanently `practice` (already public → zero assessment integrity); assessment pools stay empty until authored in 3b; assignments/windows and per-item feedback withholding arrive with the games phase; alternatives considered (separate tables, duplicated "quiz bank" DB) and why rejected. Add the row to `docs/adr/README.md`.
- [ ] **Step 3: Docs sweep**
  - `docs/02-requirements.md`: statuses → `implemented` for FR-S-12..18 (quiz/badge, flashcards, matching), FR-E-06/07/08, FR-M-03, FR-X-06..09 (migration tool rows), NFR-13, NFR-26 (purge); leave sequencing's row matching whatever FR ids cover it per the traceability table.
  - `docs/03-architecture.md`: §5 data model additions (the seven new tables + access + program), §6.2 the `v0.3.0` table set, §7 endpoint checklist ✅ for the new routes, the gradeable-items grading note, and the four planning deviations from Global Constraints recorded where each topic lives.
  - `docs/05-setup.md`: replace the single-lesson migration example with the `scan` command; document `seed/content/` and that `make seed` loads it; note `docs/legacy-migration-report.md` as the fix-list; state that all migrated content remains CC BY-NC-attributed to the legacy workbook (one attribution statement here rather than per-document markup — record this as the mechanism satisfying NFR-27's notice requirement for activity documents; lessons keep their in-content notice from the phase-1 converter).
  - `docs/06-operations.md`: content import to a deployed environment (`docker compose … run --rm api python -m app.content.importer` or re-run seed on test), the session-purge crontab line (`docker compose -f /opt/rtapps/compose.prod.yaml run --rm api python -m app.tasks.purge_sessions`), `SENTRY_DSN` in the env-var table, and a monthly-checklist line for reviewing the audit of `export_csv`/`erase_user`.
  - `README.md`: status line → v0.3.0 scope, next = plan 3b (authoring).
- [ ] **Step 4: Full gates one last time (api, web, tools, e2e); commit**

```bash
git add -A && git commit -m "docs: ADR-0006, requirement statuses, migration/ops runbooks for v0.3.0"
```

---

## Completion

After Task 17: final whole-branch code review (superpowers:requesting-code-review), fix findings, push branch, open the PR (title `feat: content types, legacy migration, educator analytics, hardening (v0.3.0)`), verify `pr.yml` green, then squash-merge and tag `v0.3.0` per superpowers:finishing-a-development-branch. Close issues #29, #30, #31 via the PR description (`Closes #29, closes #30, closes #31`).





