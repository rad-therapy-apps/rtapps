"""What this file tests: the activity snapshot builder for quiz, flashcards, matching,
and sequencing; answer stripping and gradeable-item extraction for all kinds; the
`publish_activity` service; and the generalized snapshot contract all later tasks consume.

Used here and why: reuses `make_subject`/`make_quiz`/`text_doc` from `test_activity_models.py`
to avoid duplication and keep the activity-model helpers in one place. Tests the snapshot
shape and answer-stripping independently (without HTTP or importer overhead) so this layer
can be reasoned about in isolation.

How it fits the project: plan 3a (FR-E-05/06, FR-S-07/08). Tests snapshot builders for all
four new activity kinds and verifies the stripping/grading contract Tasks 3-5 will consume.

Works with:
  Depends on: `app.content.activity_models`, `app.content.activity_snapshots`,
    `app.content.models`, `app.content.service`, `tests.test_activity_models` helpers,
    `tests.conftest.seed_lesson`.
  Used by: CI `api` job in `.github/workflows/pr.yml`; `make test-api`.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.content.activity_models import FlashcardDeck, MatchingActivity, SequencingActivity
from app.content.activity_snapshots import (
    build_activity_snapshot,
    gradeable_items,
    item_labels,
    slug_key,
    strip_activity_answers,
)
from app.content.models import Activity
from app.content.service import publish_activity
from tests.conftest import seed_lesson
from tests.test_activity_models import make_quiz, make_subject


def test_slug_key_is_stable_and_unique() -> None:
    # Stable across multiple calls.
    seen: set[str] = set()
    assert slug_key("Prodromal Stage", seen) == "prodromal_stage"
    # Collision detection: numeric suffix added.
    assert slug_key("Prodromal Stage", seen) == "prodromal_stage_2"
    # Truncation to 40 chars (UTF-8 safe, starts with letter).
    assert slug_key("X" * 80, set()).startswith("x")
    assert len(slug_key("X" * 80, set())) <= 40


async def make_matching(db: AsyncSession, subject, slug: str = "ars-match"):
    # Helper to create a matching activity with fixed pairs.
    m = MatchingActivity(
        slug=slug,
        title="ARS Match",
        pairs=[
            {"term": "Atrophy", "definition": "Shrinkage of organs"},
            {"term": "Epilation", "definition": "Loss of hair"},
            {"term": "ARS", "definition": "Acute radiation syndrome"},
        ],
    )
    db.add(m)
    await db.flush()
    activity = Activity(
        kind="matching",
        ref_id=m.id,
        title=m.title,
        subject_id=subject.id,
        config={"pass_percent": 80},
    )
    db.add(activity)
    await db.flush()
    return m, activity


async def make_sequencing(db: AsyncSession, subject, slug: str = "ars-order"):
    # Helper to create a sequencing activity with items in correct order.
    s = SequencingActivity(
        slug=slug,
        title="ARS Stages",
        items=[
            {"label": "Prodromal"},
            {"label": "Latent"},
            {"label": "Manifest illness"},
        ],
    )
    db.add(s)
    await db.flush()
    activity = Activity(
        kind="sequencing",
        ref_id=s.id,
        title=s.title,
        subject_id=subject.id,
        config={"pass_percent": 80},
    )
    db.add(activity)
    await db.flush()
    return s, activity


async def test_quiz_snapshot_strip_and_items(db: AsyncSession) -> None:
    # Quiz snapshot contains questions with answers; stripping removes them; items
    # indexed by question id.
    subject = await make_subject(db)
    _, activity = await make_quiz(db, subject)
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
    # Matching snapshot has aligned pairs; stripping decouples terms (stored order)
    # from sorted definitions.
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
    # Sequencing snapshot has correct order; stripping reorders by label; keys
    # derive from labels, not positions.
    subject = await make_subject(db)
    _, activity = await make_sequencing(db, subject)
    snap = await build_activity_snapshot(db, activity)
    # Keys derived from labels, not positions.
    keys = [i["key"] for i in snap["sequencing"]["items"]]
    assert keys == ["prodromal", "latent", "manifest_illness"]
    stripped = strip_activity_answers(snap)
    # Served sorted by label - presentation order != correct order.
    assert [i["label"] for i in stripped["sequencing"]["items"]] == [
        "Latent",
        "Manifest illness",
        "Prodromal",
    ]
    items = gradeable_items(snap)
    assert items["latent"]["body"]["answer"] == 1  # correct position of "Latent"
    assert items["latent"]["body"]["options"] == ["Position 1", "Position 2", "Position 3"]


async def test_flashcards_have_no_gradeable_items(db: AsyncSession) -> None:
    # Flashcards have no answers/options; stripping doesn't change them; no gradeable items.
    subject = await make_subject(db)
    deck = FlashcardDeck(slug="ars-cards", title="Cards", cards=[{"term": "T", "definition": "D"}])
    db.add(deck)
    await db.flush()
    activity = Activity(
        kind="flashcards", ref_id=deck.id, title="Cards", subject_id=subject.id, config={}
    )
    db.add(activity)
    await db.flush()
    snap = await build_activity_snapshot(db, activity)
    assert gradeable_items(snap) == {}
    assert strip_activity_answers(snap)["flashcards"]["cards"] == deck.cards


async def test_lesson_kind_delegates_to_existing_pipeline(db: AsyncSession) -> None:
    # Lesson activities delegate to the existing build_snapshot pipeline.
    lesson = await seed_lesson(db, publish=False)
    from sqlalchemy import select

    activity = await db.scalar(select(Activity).where(Activity.lesson_id == lesson.id))
    snap = await build_activity_snapshot(db, activity)
    assert snap["activity"]["kind"] == "lesson"
    assert gradeable_items(snap)  # the fixture lesson has a knowledge check
    labels = item_labels(snap)
    assert set(labels) == set(gradeable_items(snap))


async def test_publish_activity_versions_and_pointers(db: AsyncSession) -> None:
    # publish_activity creates versioned snapshots and repoints the activity pointer.
    subject = await make_subject(db)
    _, activity = await make_quiz(db, subject)
    v1 = await publish_activity(db, activity, author=None, change_note="import")
    assert activity.status == "published" and activity.current_version_id == v1.id
    v2 = await publish_activity(db, activity, author=None)
    assert (v1.version, v2.version) == (1, 2)
    assert activity.current_version_id == v2.id
