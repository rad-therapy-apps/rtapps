"""What this file does: builds snapshots for quiz, flashcards, matching, sequencing, and
calculator activities; strips answers from them; extracts gradeable items and human labels;
provides a generalized interface for all activity kinds that the publish service then
extends.

Used here and why: these functions are the generalization of the lesson pipeline
(`app.content.snapshot.build_snapshot` et al) to cover the new activity kinds added in
Task 1 and Task 11. Every snapshot has the same `activity` key and kind-specific sibling
keys (quiz/flashcards/matching/sequencing/lesson/calculator), so a single service
(`publish_activity`) can handle all kinds uniformly via the same versioning and publish
flow. The calculator branch embeds each referenced `DataTable`'s current title/grid by
value at publish time — a deliberate snapshot (ADR-0003's pinning guarantee extended to
data tables): editing or deleting a `DataTable` row afterwards never changes an
already-published calculator's frozen content, the same as any other kind's snapshot.

How it fits the project: plan 3a (FR-E-05/06, FR-S-07/08) and plan 3b Task 11 (data tables
+ calculator). The snapshot layer is the middle step of publish (ADR-0003): authored
working copy -> snapshot assembly -> immutable `content_version.snapshot` -> stripping for
students. Tasks 3-5, 11, and later read snapshots via `build_activity_snapshot` and
`strip_activity_answers`.

Works with:
  Depends on: `app.content.activity_models` (Quiz, FlashcardDeck, MatchingActivity,
    SequencingActivity, DataTable), `app.content.models` (Activity, Lesson, Subject),
    `app.content.snapshot` (build_snapshot, strip_answers, knowledge_checks, DEFAULT_CONFIG).
  Used by: `app.content.service.publish_activity`, `app.content.router`,
    `app.attempts.router`, `tests/test_activity_snapshots.py`,
    `tests/test_calculator_activity.py`, Tasks 3-5/9/11.
"""

import copy
import re
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.content.activity_models import (
    DataTable,
    FlashcardDeck,
    MatchingActivity,
    Quiz,
    SequencingActivity,
)
from app.content.models import Activity, Lesson, Subject
from app.content.snapshot import DEFAULT_CONFIG, build_snapshot, knowledge_checks, strip_answers

# Regex to split text on non-alphanumeric chars and replace with underscores.
_KEY_RE = re.compile(r"[^a-z0-9_]+")


def slug_key(text: str, seen: set[str]) -> str:
    """Stable item key from human text: lowercase alnum/underscore, ≤40 chars, deduped
    with a numeric suffix. Never derived from position (position can be the answer)."""
    # Convert to lowercase, replace non-alphanumeric with underscores, strip edges.
    base = _KEY_RE.sub("_", text.lower()).strip("_")[:40] or "item"
    key, n = base, 1
    # Detect collision and append numeric suffix.
    while key in seen:
        n += 1
        key = f"{base[:37]}_{n}"
    seen.add(key)
    return key


def _plain_text(doc: dict[str, Any]) -> str:
    """Concatenate a ProseMirror doc's text nodes (labels for analytics displays)."""
    out: list[str] = []

    def walk(node: dict[str, Any]) -> None:
        # Extract text from text-type nodes.
        if node.get("type") == "text":
            out.append(str(node.get("text", "")))
        # Recurse into child nodes.
        for child in node.get("content", []) or []:
            walk(child)

    walk(doc)
    # Normalize whitespace: collapse multiple spaces, strip edges.
    return " ".join(" ".join(out).split())


def _activity_part(activity: Activity) -> dict[str, Any]:
    """Extract the `activity` section common to all snapshots (id, kind, title, access, config)."""
    # Merge DEFAULT_CONFIG under the stored config so an unset pass_percent has a default.
    return {
        "id": str(activity.id),
        "kind": activity.kind,
        "title": activity.title,
        "access": activity.access,
        "config": {**DEFAULT_CONFIG, **activity.config},
    }


async def _subject_ref(db: AsyncSession, activity: Activity) -> dict[str, str] | None:
    """Fetch the subject and return its snapshot reference (slug, title)."""
    subject = await db.scalar(select(Subject).where(Subject.id == activity.subject_id))
    return {"slug": subject.slug, "title": subject.title} if subject else None


async def build_activity_snapshot(db: AsyncSession, activity: Activity) -> dict[str, Any]:
    """Resolve any activity's working copy into one snapshot document (unstripped)."""
    # Lesson activities use the existing pipeline.
    if activity.kind == "lesson":
        # Delegate to the existing lesson pipeline, then add the access field it predates.
        lesson = await db.scalar(select(Lesson).where(Lesson.id == activity.lesson_id))
        if lesson is None:
            raise ValueError(f"activity {activity.id} has no lesson")
        snap = await build_snapshot(db, lesson)
        snap["activity"]["access"] = activity.access
        return snap
    # Fetch subject reference for non-lesson activities.
    subject = await _subject_ref(db, activity)
    # Quiz: resolve questions from the quiz's question bank via QuizQuestion join.
    if activity.kind == "quiz":
        quiz = await db.scalar(select(Quiz).where(Quiz.id == activity.ref_id))
        assert quiz is not None
        # Build a question snapshot for each quiz question in position order.
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
        payload = {
            "id": str(quiz.id),
            "slug": quiz.slug,
            "title": quiz.title,
            "subject": subject,
            "questions": questions,
        }
        return {"activity": _activity_part(activity), "quiz": payload}
    # Flashcards: JSONB payload (no per-row question bank).
    if activity.kind == "flashcards":
        deck = await db.scalar(select(FlashcardDeck).where(FlashcardDeck.id == activity.ref_id))
        assert deck is not None
        return {
            "activity": _activity_part(activity),
            "flashcards": {
                "id": str(deck.id),
                "slug": deck.slug,
                "title": deck.title,
                "subject": subject,
                "cards": deck.cards,
            },
        }
    # Matching: JSONB payload with auto-generated keys (pair_01, pair_02, ...).
    if activity.kind == "matching":
        m = await db.scalar(select(MatchingActivity).where(MatchingActivity.id == activity.ref_id))
        assert m is not None
        # Add keys to pairs based on their position in the stored order.
        pairs = [{"key": f"pair_{i:02d}", **p} for i, p in enumerate(m.pairs, start=1)]
        return {
            "activity": _activity_part(activity),
            "matching": {
                "id": str(m.id),
                "slug": m.slug,
                "title": m.title,
                "subject": subject,
                "pairs": pairs,
            },
        }
    # Sequencing: JSONB payload with keys derived from labels (not positions).
    if activity.kind == "sequencing":
        s = await db.scalar(
            select(SequencingActivity).where(SequencingActivity.id == activity.ref_id)
        )
        assert s is not None
        # Derive keys from labels using slug_key; never from position (position is the answer).
        seen: set[str] = set()
        items = [{"key": slug_key(i["label"], seen), **i} for i in s.items]
        return {
            "activity": _activity_part(activity),
            "sequencing": {
                "id": str(s.id),
                "slug": s.slug,
                "title": s.title,
                "subject": subject,
                "items": items,
            },
        }
    # Calculator: embed each referenced DataTable by value (title + grid), not by reference —
    # this is what pins the calculator's content at publish time (see the module docstring).
    if activity.kind == "calculator":
        tables: dict[str, Any] = {}
        for key in activity.config.get("data_tables", []):
            table = await db.scalar(select(DataTable).where(DataTable.key == key))
            if table is None:
                # Caught by the publish route and turned into a 422 (an authoring mistake:
                # a data table was renamed/deleted after the calculator was pointed at it).
                raise ValueError(f"calculator references missing data table {key!r}")
            tables[key] = {"title": table.title, "grid": table.grid}
        return {
            "activity": _activity_part(activity),
            "calculator": {"calc_type": activity.config.get("calc_type"), "data_tables": tables},
        }
    # External: an embedded browser app (plan 4a). There is no working-copy row to resolve —
    # the snapshot pins the arcade slug and score ceiling straight from the activity config,
    # so a later config edit never changes what an already-pinned attempt was played against.
    if activity.kind == "external":
        return {
            "activity": _activity_part(activity),
            "external": {
                "arcade_slug": activity.config.get("arcade_slug"),
                "max_score": activity.config.get("max_score"),
                "completion_only": activity.config.get("completion_only", False),
                "subject": subject,
            },
        }
    raise ValueError(f"unknown activity kind {activity.kind}")


def strip_activity_answers(snapshot: dict[str, Any]) -> dict[str, Any]:
    """Deep copy with everything answer-revealing removed — the ONLY shape a student sees."""
    kind = snapshot["activity"]["kind"]
    # Lesson activities use the existing stripping pipeline.
    if kind == "lesson":
        return strip_answers(snapshot)
    # Deep copy to avoid mutating the original snapshot.
    out = copy.deepcopy(snapshot)
    # Quiz: remove answer index and explanation from each question.
    if kind == "quiz":
        for q in out["quiz"]["questions"]:
            q["body"].pop("answer", None)
            q.pop("explanation", None)
    # Matching: decouple stored pairs into terms (stored order) and definitions (sorted).
    elif kind == "matching":
        # Alignment is the secret: replace aligned pairs with terms (stored order) and
        # definitions sorted alphabetically — sorted order is derivable from public data,
        # so grading (gradeable_items) can index into the same list.
        pairs = out["matching"].pop("pairs")
        out["matching"]["terms"] = [{"key": p["key"], "term": p["term"]} for p in pairs]
        out["matching"]["definitions"] = sorted(p["definition"] for p in pairs)
    # Sequencing: reorder items by label (hiding the correct order).
    elif kind == "sequencing":
        # Stored order is the answer: serve items sorted by label instead.
        out["sequencing"]["items"] = sorted(
            out["sequencing"]["items"], key=lambda i: str(i["label"]).lower()
        )
    # Flashcards and calculator: nothing secret — pass the deep copy through unchanged.
    # (A data table's grid is a reference tool, not an answer key.)
    return out


def gradeable_items(snapshot: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Every kind's answers as per-item single-choice.

    Format: {key: {body: {options, answer}, explanation}}.
    """
    kind = snapshot["activity"]["kind"]
    # Lesson: extract knowledge_check blocks and map them to single-choice items.
    if kind == "lesson":
        return {
            key: {
                "body": {"options": b["body"]["options"], "answer": b["body"]["answer"]},
                "explanation": b.get("explanation"),
            }
            for key, b in knowledge_checks(snapshot).items()
        }
    # Quiz: map each question to a single-choice item.
    if kind == "quiz":
        return {
            q["key"]: {
                "body": {"options": q["body"]["options"], "answer": q["body"]["answer"]},
                "explanation": q.get("explanation"),
            }
            for q in snapshot["quiz"]["questions"]
        }
    # Matching: each pair's answer is the index of its definition in the sorted list.
    if kind == "matching":
        pairs = snapshot["matching"]["pairs"]
        # Sorted definitions (same as what students see after stripping).
        defs = sorted(p["definition"] for p in pairs)
        return {
            p["key"]: {
                "body": {"options": defs, "answer": defs.index(p["definition"])},
                "explanation": None,
            }
            for p in pairs
        }
    # Sequencing: each item's answer is its position in the stored order; options are
    # position labels.
    if kind == "sequencing":
        items = snapshot["sequencing"]["items"]
        # Options are position labels (independent of student-facing ordering).
        options = [f"Position {j + 1}" for j in range(len(items))]
        return {
            it["key"]: {"body": {"options": options, "answer": idx}, "explanation": None}
            for idx, it in enumerate(items)
        }
    # Flashcards and calculator: completion-only (no gradeable items) — moot for calculator
    # anyway, since Task 11's attempts guard rejects starting an attempt on one at all.
    return {}


def item_labels(snapshot: dict[str, Any]) -> dict[str, str]:
    """Short human label per gradeable item key (educator analytics displays)."""
    kind = snapshot["activity"]["kind"]
    # Lesson: extract stem text from knowledge_check blocks.
    if kind == "lesson":
        return {key: _plain_text(b["stem"]) for key, b in knowledge_checks(snapshot).items()}
    # Quiz: extract stem text from each question.
    if kind == "quiz":
        return {q["key"]: _plain_text(q["stem"]) for q in snapshot["quiz"]["questions"]}
    # Matching: use the term as the label.
    if kind == "matching":
        return {p["key"]: p["term"] for p in snapshot["matching"]["pairs"]}
    # Sequencing: use the label field.
    if kind == "sequencing":
        return {i["key"]: i["label"] for i in snapshot["sequencing"]["items"]}
    # Flashcards: no labels.
    return {}
