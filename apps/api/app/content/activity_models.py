"""SQLAlchemy ORM models for the content types added in plan 3a: quiz, flashcards, matching,
sequencing, outcomes, and question-outcome tagging.

What this file does: defines the tables for Quiz/FlashcardDeck/MatchingActivity/
SequencingActivity (four new activity kinds), Outcome (SLO vocabulary), QuestionOutcome
(question-level outcome tags), and QuizQuestion (the join table linking questions to quizzes).

Used here and why: SQLAlchemy 2.0 `Mapped`/`mapped_column` declarative models matching the
rest of the app. Quiz and QuizQuestion use the existing Question row bank; the three
JSONB payload types (FlashcardDeck/MatchingActivity/SequencingActivity) hold author-edited
content wholesale as JSON so the shape can evolve without a migration. `lazy="selectin"` on
`Quiz.questions` batch-loads the question list (always needed by the snapshot builder) in
one extra query per quiz instead of N+1 round trips.

How it fits the project: plan 3a (FR-E-05/06, FR-S-07/08). These models are consumed by
Task 2 (snapshots), Task 3 (routes), and downstream tasks 4-10. The outcome vocabulary
(FR-E-07) is stored here; FR-A-14 (broader outcome tagging in 3b) will extend it.

Works with:
  Depends on: `app.auth.models.TimestampMixin` (created_at/updated_at columns), `app.db.Base`
    (declarative base), `app.ids.new_id` (UUIDv7 primary keys), `app.content.models.Question`
    (shared bank material).
  Used by: `app.content.snapshot` (reads the tree), `app.content.router` (reads
    questions/outcomes), `app.content.importer` (writes working copies), `alembic/env.py`
    (imported for autogenerate metadata), and Tasks 2-10 test/implementation modules.
"""

import uuid
from typing import Any

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.auth.models import TimestampMixin
from app.content.models import Question
from app.db import Base
from app.ids import new_id

# NOTE: Additional imports (Any is already imported above) for DataTable model.


# Working copy of a quiz: title + ordered question-bank rows via QuizQuestion. Pass
# percent and shuffle live in the paired Activity.config (the existing pattern), not here.
class Quiz(TimestampMixin, Base):
    __tablename__ = "quiz"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    # selectin: the snapshot builder always needs every question; batch-load them.
    questions: Mapped[list["QuizQuestion"]] = relationship(
        back_populates="quiz",
        order_by="QuizQuestion.position",
        cascade="all, delete-orphan",
        lazy="selectin",
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
    # [{term, definition}]
    cards: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)


class MatchingActivity(TimestampMixin, Base):
    __tablename__ = "matching_activity"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    # [{term, definition}]
    pairs: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)


class SequencingActivity(TimestampMixin, Base):
    __tablename__ = "sequencing_activity"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    # correct order; [{label, detail?}]
    items: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)


# SLO/outcome vocabulary (FR-E-07); question-level tags only in 3a (FR-A-14 is 3b).
class Outcome(TimestampMixin, Base):
    __tablename__ = "outcome"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    code: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)


class QuestionOutcome(Base):
    __tablename__ = "question_outcome"
    __table_args__ = (UniqueConstraint("question_id", "outcome_id", name="uq_question_outcome"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    question_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("question.id", ondelete="CASCADE"), nullable=False
    )
    outcome_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("outcome.id", ondelete="CASCADE"), nullable=False, index=True
    )


# Author-editable numeric lookup grid (PDD/TMR etc.), referenced by key from a
# calculator activity's config and embedded into its snapshot at publish (plan 3b §4).
class DataTable(TimestampMixin, Base):
    __tablename__ = "data_table"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    key: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    # {"row_label": str, "col_label": str, "cols": [num...],
    # "rows": [{"key": num, "values": [num...]}]}
    grid: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="SET NULL"), nullable=True
    )
