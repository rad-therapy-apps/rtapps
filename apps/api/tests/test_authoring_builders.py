"""What this file tests: every route added in `app.authoring.router` for the question bank
(`GET/POST/PUT /authoring/questions[...]`) and the four activity builders — quiz,
flashcard deck, matching, sequencing. One class per builder kind covers: create -> 201 with
a paired draft `Activity` of the right kind; `GET` round-trips what `POST`/`PUT` wrote; `PUT`
replaces content wholesale; the kind-specific validation rejection (duplicate matching
terms, duplicate sequencing labels, an unknown quiz question id, an out-of-range question
answer); a kind-mismatch 404 (addressing a lesson's activity id through a builder route);
and one authz spot-check (student 403 — the full role matrix is Task 8's job, proven once
for the router-level `require_author` dependency every route here shares).

Used here and why: `client`/`db` from `conftest.py`; `make_educator`/`promote` from
`test_cohorts.py`, matching every other authoring test module's idiom.

How it fits the project: plan 3b Task 9 — the question bank and the four activity
builders Task 16's builder pages will consume.

Works with: pytest-asyncio, httpx.
Depends on: `app.authoring.router`; `app.content.models` (Activity, Subject).
Used by: CI `api` job; `make test-api`.
"""

import uuid
from typing import Any

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.content.models import Activity, Subject
from app.content.service import publish_activity
from tests.conftest import register
from tests.test_cohorts import make_educator


async def _ensure_subject(db: AsyncSession, slug: str = "radiation-biology") -> None:
    """Create the subject builder rows are filed under, unless a prior call already did."""
    if await db.scalar(select(Subject.id).where(Subject.slug == slug)) is None:
        db.add(Subject(slug=slug, title="Radiation Biology", order=1))
        await db.flush()


async def _create_draft_lesson(client: AsyncClient, db: AsyncSession) -> dict[str, Any]:
    """A minimal draft lesson, used only as an off-kind activity id for mismatch checks."""
    await _ensure_subject(db)
    r = await client.post(
        "/api/v1/authoring/lessons",
        json={"subject_slug": "radiation-biology", "title": "A Lesson", "slug": "a-lesson"},
    )
    assert r.status_code == 201, r.text
    body: dict[str, Any] = r.json()
    return body


async def _create_question(
    client: AsyncClient,
    *,
    stem: str = "What is the SI unit of absorbed dose?",
    options: list[str] | None = None,
    answer: int = 0,
    explanation: str | None = "Gray, by definition.",
) -> dict[str, Any]:
    r = await client.post(
        "/api/v1/authoring/questions",
        json={
            "stem": stem,
            "options": options or ["Gray", "Sievert"],
            "answer": answer,
            "explanation": explanation,
        },
    )
    assert r.status_code == 201, r.text
    body: dict[str, Any] = r.json()
    return body


# ---------------------------------------------------------------------------
# Question bank: GET (list + filter) / POST / PUT
# ---------------------------------------------------------------------------


class TestQuestionBank:
    async def test_create_and_get_round_trip(self, client: AsyncClient, db: AsyncSession) -> None:
        await make_educator(client, db, "edu@example.edu")
        created = await _create_question(client)
        uuid.UUID(created["id"])
        assert created["stem"] == "What is the SI unit of absorbed dose?"
        assert created["options"] == ["Gray", "Sievert"]
        assert created["answer"] == 0
        assert created["explanation"] == "Gray, by definition."

        listed = await client.get("/api/v1/authoring/questions")
        assert listed.status_code == 200, listed.text
        assert any(q["id"] == created["id"] for q in listed.json())

        filtered = await client.get("/api/v1/authoring/questions", params={"q": "absorbed dose"})
        assert filtered.status_code == 200, filtered.text
        assert any(q["id"] == created["id"] for q in filtered.json())

        missed = await client.get("/api/v1/authoring/questions", params={"q": "no-such-stem-text"})
        assert missed.status_code == 200, missed.text
        assert all(q["id"] != created["id"] for q in missed.json())

    async def test_put_replaces_content(self, client: AsyncClient, db: AsyncSession) -> None:
        await make_educator(client, db, "edu@example.edu")
        created = await _create_question(client)
        r = await client.put(
            f"/api/v1/authoring/questions/{created['id']}",
            json={
                "stem": "Updated stem?",
                "options": ["X", "Y", "Z"],
                "answer": 2,
                "explanation": None,
            },
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["stem"] == "Updated stem?"
        assert body["options"] == ["X", "Y", "Z"]
        assert body["answer"] == 2
        assert body["explanation"] is None

    async def test_put_unknown_404(self, client: AsyncClient, db: AsyncSession) -> None:
        await make_educator(client, db, "edu@example.edu")
        r = await client.put(
            f"/api/v1/authoring/questions/{uuid.uuid4()}",
            json={"stem": "X?", "options": ["A", "B"], "answer": 0},
        )
        assert r.status_code == 404

    async def test_create_rejects_answer_out_of_range(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        r = await client.post(
            "/api/v1/authoring/questions",
            json={"stem": "X?", "options": ["A", "B"], "answer": 5},
        )
        assert r.status_code == 422, r.text
        assert r.json()["errors"]

    async def test_create_student_403(self, client: AsyncClient, db: AsyncSession) -> None:
        await register(client)
        r = await client.post(
            "/api/v1/authoring/questions",
            json={"stem": "X?", "options": ["A", "B"], "answer": 0},
        )
        assert r.status_code == 403

    async def test_question_search_escapes_ilike_wildcards(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        # Create two questions: one with a literal underscore in the stem, one with different text.
        # The `_` in question stems will be treated as plain text, not a wildcard.
        q_underscore = await _create_question(client, stem="score_a underscore")
        q_wildcard_bait = await _create_question(client, stem="scoreXa wildcard bait")

        # Search for "score_a" - should match ONLY the question with literal underscore,
        # not the one with "scoreXa" (which would match if _ was a wildcard).
        result = await client.get("/api/v1/authoring/questions", params={"q": "score_a"})
        assert result.status_code == 200, result.text
        matching_ids = [q["id"] for q in result.json()]
        assert q_underscore["id"] in matching_ids, "Question with literal underscore should match"
        assert q_wildcard_bait["id"] not in matching_ids, (
            "Question with 'scoreXa' should not match search for 'score_a' (underscore not wildcard)"
        )


# ---------------------------------------------------------------------------
# Quiz builder
# ---------------------------------------------------------------------------


class TestQuizBuilder:
    async def _create_quiz(
        self, client: AsyncClient, db: AsyncSession, slug: str = "quiz-one"
    ) -> dict[str, Any]:
        await _ensure_subject(db)
        r = await client.post(
            "/api/v1/authoring/quizzes",
            json={
                "subject_slug": "radiation-biology",
                "title": "Quiz One",
                "slug": slug,
                "access": "practice",
                "config": {"pass_percent": 70},
            },
        )
        assert r.status_code == 201, r.text
        body: dict[str, Any] = r.json()
        return body

    async def test_create_has_paired_draft_activity_and_no_questions(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        quiz = await self._create_quiz(client, db)
        assert quiz["status"] == "draft" and quiz["questions"] == []
        assert quiz["subject_slug"] == "radiation-biology" and quiz["slug"] == "quiz-one"
        assert quiz["access"] == "practice" and quiz["config"] == {"pass_percent": 70}
        uuid.UUID(quiz["activity_id"])
        uuid.UUID(quiz["quiz_id"])

        activity = await db.get(Activity, uuid.UUID(quiz["activity_id"]))
        assert (
            activity is not None
            and activity.kind == "quiz"
            and activity.ref_id == uuid.UUID(quiz["quiz_id"])
        )

    async def test_slug_conflict_409(self, client: AsyncClient, db: AsyncSession) -> None:
        await make_educator(client, db, "edu@example.edu")
        await self._create_quiz(client, db, slug="dup-quiz")
        dup = await client.post(
            "/api/v1/authoring/quizzes",
            json={
                "subject_slug": "radiation-biology",
                "title": "Another",
                "slug": "dup-quiz",
                "access": "practice",
                "config": {},
            },
        )
        assert dup.status_code == 409

    async def test_get_round_trips_and_put_replaces_questions(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        quiz = await self._create_quiz(client, db)
        q1 = await _create_question(client, stem="Q1?")
        q2 = await _create_question(client, stem="Q2?")

        r = await client.put(
            f"/api/v1/authoring/quizzes/{quiz['activity_id']}",
            json={
                "title": "Quiz One Retitled",
                "question_ids": [q1["id"], q2["id"]],
                "access": "assessment",
                "config": {"pass_percent": 90, "shuffle": False},
            },
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["title"] == "Quiz One Retitled"
        assert body["access"] == "assessment"
        assert body["config"] == {"pass_percent": 90, "shuffle": False}
        assert [q["id"] for q in body["questions"]] == [q1["id"], q2["id"]]

        got = await client.get(f"/api/v1/authoring/quizzes/{quiz['activity_id']}")
        assert got.status_code == 200, got.text
        assert got.json() == body

        # Replace again with a reversed/reduced set: positions must follow the new order.
        r2 = await client.put(
            f"/api/v1/authoring/quizzes/{quiz['activity_id']}",
            json={
                "title": "Quiz One Retitled",
                "question_ids": [q2["id"]],
                "access": "assessment",
                "config": {},
            },
        )
        assert r2.status_code == 200, r2.text
        assert [q["id"] for q in r2.json()["questions"]] == [q2["id"]]

    async def test_put_rejects_unknown_question_id(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        quiz = await self._create_quiz(client, db)
        r = await client.put(
            f"/api/v1/authoring/quizzes/{quiz['activity_id']}",
            json={
                "title": "X",
                "question_ids": [str(uuid.uuid4())],
                "access": "practice",
                "config": {},
            },
        )
        assert r.status_code == 422, r.text

    async def test_put_rejects_duplicate_question_ids(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        quiz = await self._create_quiz(client, db)
        q1 = await _create_question(client)
        r = await client.put(
            f"/api/v1/authoring/quizzes/{quiz['activity_id']}",
            json={
                "title": "X",
                "question_ids": [q1["id"], q1["id"]],
                "access": "practice",
                "config": {},
            },
        )
        assert r.status_code == 422, r.text

    async def test_get_kind_mismatch_404_for_lesson_activity(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        lesson = await _create_draft_lesson(client, db)
        r = await client.get(f"/api/v1/authoring/quizzes/{lesson['activity_id']}")
        assert r.status_code == 404

    async def test_create_student_403(self, client: AsyncClient, db: AsyncSession) -> None:
        await _ensure_subject(db)
        await register(client)
        r = await client.post(
            "/api/v1/authoring/quizzes",
            json={
                "subject_slug": "radiation-biology",
                "title": "X",
                "slug": "x",
                "access": "practice",
                "config": {},
            },
        )
        assert r.status_code == 403

    async def test_put_on_published_quiz_leaves_pinned_snapshot_unchanged(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        # Create a quiz with one question.
        quiz = await self._create_quiz(client, db)
        q1 = await _create_question(client, stem="Original Question")
        r = await client.put(
            f"/api/v1/authoring/quizzes/{quiz['activity_id']}",
            json={
                "title": "Original Title",
                "question_ids": [q1["id"]],
                "access": "practice",
                "config": {"pass_percent": 70},
            },
        )
        assert r.status_code == 200, r.text

        # Publish the quiz.
        activity = await db.get(Activity, uuid.UUID(quiz["activity_id"]))
        assert activity is not None
        await publish_activity(db, activity, author=None, change_note="test publish")

        # Student can now see the published quiz content.
        published = (await client.get(f"/api/v1/activities/{quiz['activity_id']}")).json()
        assert published["snapshot"]["quiz"]["title"] == "Original Title"
        assert len(published["snapshot"]["quiz"]["questions"]) == 1
        # Snapshot stores stems as ProseMirror docs; extract the text from it.
        original_stem = published["snapshot"]["quiz"]["questions"][0]["stem"]
        assert isinstance(original_stem, dict) and "content" in original_stem

        # Edit the working copy to something different.
        q2 = await _create_question(client, stem="New Question")
        r = await client.put(
            f"/api/v1/authoring/quizzes/{quiz['activity_id']}",
            json={
                "title": "Edited After Publish",
                "question_ids": [q2["id"]],
                "access": "assessment",
                "config": {"pass_percent": 90},
            },
        )
        assert r.status_code == 200, r.text
        # Working copy did change.
        assert r.json()["title"] == "Edited After Publish"
        assert r.json()["questions"][0]["stem"] == "New Question"

        # But the served student snapshot is still the pre-edit content (edit != publish).
        still_published = (await client.get(f"/api/v1/activities/{quiz['activity_id']}")).json()
        assert still_published["snapshot"]["quiz"]["title"] == "Original Title"
        assert len(still_published["snapshot"]["quiz"]["questions"]) == 1
        # Snapshot stem should be unchanged (same ProseMirror doc as before).
        still_original_stem = still_published["snapshot"]["quiz"]["questions"][0]["stem"]
        assert still_original_stem == original_stem


# ---------------------------------------------------------------------------
# Flashcard deck builder
# ---------------------------------------------------------------------------


class TestFlashcardDeckBuilder:
    async def _create_deck(
        self, client: AsyncClient, db: AsyncSession, slug: str = "deck-one"
    ) -> dict[str, Any]:
        await _ensure_subject(db)
        r = await client.post(
            "/api/v1/authoring/flashcard-decks",
            json={
                "subject_slug": "radiation-biology",
                "title": "Deck One",
                "slug": slug,
                "access": "practice",
                "config": {},
                "cards": [{"term": "Gray", "definition": "SI unit of absorbed dose"}],
            },
        )
        assert r.status_code == 201, r.text
        body: dict[str, Any] = r.json()
        return body

    async def test_create_has_paired_draft_activity(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        deck = await self._create_deck(client, db)
        assert deck["status"] == "draft"
        assert deck["cards"] == [{"term": "Gray", "definition": "SI unit of absorbed dose"}]

        activity = await db.get(Activity, uuid.UUID(deck["activity_id"]))
        assert activity is not None and activity.kind == "flashcards"

    async def test_get_round_trips_and_put_replaces_cards(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        deck = await self._create_deck(client, db)
        r = await client.put(
            f"/api/v1/authoring/flashcard-decks/{deck['activity_id']}",
            json={
                "title": "Deck One Retitled",
                "access": "practice",
                "config": {},
                "cards": [
                    {"term": "Sievert", "definition": "SI unit of equivalent dose"},
                    {"term": "Gray", "definition": "SI unit of absorbed dose"},
                ],
            },
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["title"] == "Deck One Retitled"
        assert len(body["cards"]) == 2

        got = await client.get(f"/api/v1/authoring/flashcard-decks/{deck['activity_id']}")
        assert got.status_code == 200, got.text
        assert got.json() == body

    async def test_create_rejects_empty_cards(self, client: AsyncClient, db: AsyncSession) -> None:
        await make_educator(client, db, "edu@example.edu")
        await _ensure_subject(db)
        r = await client.post(
            "/api/v1/authoring/flashcard-decks",
            json={
                "subject_slug": "radiation-biology",
                "title": "Empty Deck",
                "slug": "empty-deck",
                "access": "practice",
                "config": {},
                "cards": [],
            },
        )
        assert r.status_code == 422, r.text

    async def test_get_kind_mismatch_404_for_lesson_activity(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        lesson = await _create_draft_lesson(client, db)
        r = await client.get(f"/api/v1/authoring/flashcard-decks/{lesson['activity_id']}")
        assert r.status_code == 404

    async def test_create_student_403(self, client: AsyncClient, db: AsyncSession) -> None:
        await _ensure_subject(db)
        await register(client)
        r = await client.post(
            "/api/v1/authoring/flashcard-decks",
            json={
                "subject_slug": "radiation-biology",
                "title": "X",
                "slug": "x",
                "access": "practice",
                "config": {},
                "cards": [{"term": "A", "definition": "B"}],
            },
        )
        assert r.status_code == 403


# ---------------------------------------------------------------------------
# Matching builder
# ---------------------------------------------------------------------------


class TestMatchingBuilder:
    async def _create_matching(
        self, client: AsyncClient, db: AsyncSession, slug: str = "matching-one"
    ) -> dict[str, Any]:
        await _ensure_subject(db)
        r = await client.post(
            "/api/v1/authoring/matching",
            json={
                "subject_slug": "radiation-biology",
                "title": "Matching One",
                "slug": slug,
                "access": "practice",
                "config": {},
                "pairs": [
                    {"term": "Gray", "definition": "Absorbed dose unit"},
                    {"term": "Sievert", "definition": "Equivalent dose unit"},
                ],
            },
        )
        assert r.status_code == 201, r.text
        body: dict[str, Any] = r.json()
        return body

    async def test_create_has_paired_draft_activity(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        matching = await self._create_matching(client, db)
        assert matching["status"] == "draft" and len(matching["pairs"]) == 2

        activity = await db.get(Activity, uuid.UUID(matching["activity_id"]))
        assert activity is not None and activity.kind == "matching"

    async def test_get_round_trips_and_put_replaces_pairs(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        matching = await self._create_matching(client, db)
        r = await client.put(
            f"/api/v1/authoring/matching/{matching['activity_id']}",
            json={
                "title": "Matching One Retitled",
                "access": "practice",
                "config": {"pass_percent": 60},
                "pairs": [
                    {"term": "Rad", "definition": "Older absorbed dose unit"},
                    {"term": "Rem", "definition": "Older equivalent dose unit"},
                ],
            },
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["title"] == "Matching One Retitled"
        assert {p["term"] for p in body["pairs"]} == {"Rad", "Rem"}

        got = await client.get(f"/api/v1/authoring/matching/{matching['activity_id']}")
        assert got.status_code == 200, got.text
        assert got.json() == body

    async def test_create_rejects_duplicate_terms(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        await _ensure_subject(db)
        r = await client.post(
            "/api/v1/authoring/matching",
            json={
                "subject_slug": "radiation-biology",
                "title": "Bad",
                "slug": "bad-matching",
                "access": "practice",
                "config": {},
                "pairs": [
                    {"term": "Gray", "definition": "A"},
                    {"term": "Gray", "definition": "B"},
                ],
            },
        )
        assert r.status_code == 422, r.text
        assert r.json()["errors"]

    async def test_create_rejects_duplicate_definitions(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        await _ensure_subject(db)
        r = await client.post(
            "/api/v1/authoring/matching",
            json={
                "subject_slug": "radiation-biology",
                "title": "Bad",
                "slug": "bad-matching-2",
                "access": "practice",
                "config": {},
                "pairs": [
                    {"term": "Gray", "definition": "Same"},
                    {"term": "Sievert", "definition": "Same"},
                ],
            },
        )
        assert r.status_code == 422, r.text

    async def test_get_kind_mismatch_404_for_lesson_activity(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        lesson = await _create_draft_lesson(client, db)
        r = await client.get(f"/api/v1/authoring/matching/{lesson['activity_id']}")
        assert r.status_code == 404

    async def test_create_student_403(self, client: AsyncClient, db: AsyncSession) -> None:
        await _ensure_subject(db)
        await register(client)
        r = await client.post(
            "/api/v1/authoring/matching",
            json={
                "subject_slug": "radiation-biology",
                "title": "X",
                "slug": "x",
                "access": "practice",
                "config": {},
                "pairs": [{"term": "A", "definition": "1"}, {"term": "B", "definition": "2"}],
            },
        )
        assert r.status_code == 403


# ---------------------------------------------------------------------------
# Sequencing builder
# ---------------------------------------------------------------------------


class TestSequencingBuilder:
    async def _create_sequencing(
        self, client: AsyncClient, db: AsyncSession, slug: str = "sequencing-one"
    ) -> dict[str, Any]:
        await _ensure_subject(db)
        r = await client.post(
            "/api/v1/authoring/sequencing",
            json={
                "subject_slug": "radiation-biology",
                "title": "Sequencing One",
                "slug": slug,
                "access": "practice",
                "config": {},
                "items": [{"label": "First"}, {"label": "Second", "detail": "then this"}],
            },
        )
        assert r.status_code == 201, r.text
        body: dict[str, Any] = r.json()
        return body

    async def test_create_has_paired_draft_activity(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        sequencing = await self._create_sequencing(client, db)
        assert sequencing["status"] == "draft" and len(sequencing["items"]) == 2

        activity = await db.get(Activity, uuid.UUID(sequencing["activity_id"]))
        assert activity is not None and activity.kind == "sequencing"

    async def test_get_round_trips_and_put_replaces_items(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        sequencing = await self._create_sequencing(client, db)
        r = await client.put(
            f"/api/v1/authoring/sequencing/{sequencing['activity_id']}",
            json={
                "title": "Sequencing One Retitled",
                "access": "practice",
                "config": {"pass_percent": 100},
                "items": [
                    {"label": "Step A"},
                    {"label": "Step B"},
                    {"label": "Step C", "detail": "last"},
                ],
            },
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["title"] == "Sequencing One Retitled"
        assert [i["label"] for i in body["items"]] == ["Step A", "Step B", "Step C"]

        got = await client.get(f"/api/v1/authoring/sequencing/{sequencing['activity_id']}")
        assert got.status_code == 200, got.text
        assert got.json() == body

    async def test_create_rejects_duplicate_labels(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        await _ensure_subject(db)
        r = await client.post(
            "/api/v1/authoring/sequencing",
            json={
                "subject_slug": "radiation-biology",
                "title": "Bad",
                "slug": "bad-sequencing",
                "access": "practice",
                "config": {},
                "items": [{"label": "Step"}, {"label": "Step"}],
            },
        )
        assert r.status_code == 422, r.text
        assert r.json()["errors"]

    async def test_create_rejects_fewer_than_two_items(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        await _ensure_subject(db)
        r = await client.post(
            "/api/v1/authoring/sequencing",
            json={
                "subject_slug": "radiation-biology",
                "title": "Bad",
                "slug": "bad-sequencing-2",
                "access": "practice",
                "config": {},
                "items": [{"label": "Only One"}],
            },
        )
        assert r.status_code == 422, r.text

    async def test_get_kind_mismatch_404_for_lesson_activity(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        lesson = await _create_draft_lesson(client, db)
        r = await client.get(f"/api/v1/authoring/sequencing/{lesson['activity_id']}")
        assert r.status_code == 404

    async def test_create_student_403(self, client: AsyncClient, db: AsyncSession) -> None:
        await _ensure_subject(db)
        await register(client)
        r = await client.post(
            "/api/v1/authoring/sequencing",
            json={
                "subject_slug": "radiation-biology",
                "title": "X",
                "slug": "x",
                "access": "practice",
                "config": {},
                "items": [{"label": "A"}, {"label": "B"}],
            },
        )
        assert r.status_code == 403
