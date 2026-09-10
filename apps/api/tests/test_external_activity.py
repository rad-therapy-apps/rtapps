"""What this file tests: the `external` activity kind (plan 4a) — model constraint,
snapshot shape, and (Task 2) the score-submit lifecycle.

Used here and why: mirrors test_calculator_activity.py's publish-then-read idiom; the
snapshot must embed arcade_slug/max_score from config at publish time. There is no
authoring route for `external` in 4a (Task 1 is API groundwork only), so the activity row
is created directly via the ORM instead of through an authoring endpoint.

How it fits the project: plan 4a §3 (player route contract), docs/03-architecture.md §6.5.
Depends on: `client`/`db` fixtures and `register` from `conftest.py`; `make_educator` from
`test_cohorts.py`; `app.content.service.publish_activity`; `import_any`/`QUIZ_DOC` for the
submit-rejection test against a non-external (quiz) activity.
Used by: CI `api` job; `make test-api`.
"""

from typing import Any

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.attempts.rollup import ActivityResult
from app.content.activity_importer import import_any
from app.content.models import Activity, Subject
from app.content.service import publish_activity
from app.ids import new_id
from tests.conftest import register
from tests.test_activity_importer import QUIZ_DOC
from tests.test_cohorts import make_educator


async def _ensure_subject(db: AsyncSession, slug: str = "radiation-biology") -> Subject:
    subject = await db.scalar(select(Subject).where(Subject.slug == slug))
    if subject is None:
        subject = Subject(slug=slug, title="Radiation Biology", order=1)
        db.add(subject)
        await db.flush()
    return subject


async def _publish_external_activity(db: AsyncSession, max_score: int = 5000) -> Activity:
    subject = await _ensure_subject(db)
    activity = Activity(
        kind="external",
        ref_id=new_id(),
        title="Cell Defender",
        subject_id=subject.id,
        status="draft",
        access="practice",
        config={"arcade_slug": "cell-defender", "max_score": max_score},
    )
    db.add(activity)
    await db.flush()
    await publish_activity(db, activity, author=None, change_note="test")
    return activity


async def _publish_completion_only_activity(db: AsyncSession) -> Activity:
    subject = await _ensure_subject(db)
    activity = Activity(
        kind="external",
        ref_id=new_id(),
        title="Beam Sculptor",
        subject_id=subject.id,
        status="draft",
        access="practice",
        config={"arcade_slug": "beam-sculptor", "completion_only": True},
    )
    db.add(activity)
    await db.flush()
    await publish_activity(db, activity, author=None, change_note="test")
    return activity


async def _start_attempt(client: AsyncClient, activity_id: Any) -> dict[str, Any]:
    r = await client.post(f"/api/v1/activities/{activity_id}/attempts")
    assert r.status_code == 201, r.text
    body: dict[str, Any] = r.json()
    assert body["status"] == "in_progress"
    return body


class TestExternalActivitySnapshot:
    async def test_publish_and_snapshot(self, client: AsyncClient, db: AsyncSession) -> None:
        await make_educator(client, db, "edu@example.edu")
        subject = await _ensure_subject(db)

        activity = Activity(
            kind="external",
            ref_id=new_id(),
            title="Cell Defender",
            subject_id=subject.id,
            status="draft",
            access="practice",
            config={"arcade_slug": "cell-defender", "max_score": 5000},
        )
        db.add(activity)
        await db.flush()

        version = await publish_activity(db, activity, author=None, change_note="test")
        snap = version.snapshot
        assert snap["activity"]["kind"] == "external"
        assert snap["external"]["arcade_slug"] == "cell-defender"
        assert snap["external"]["max_score"] == 5000
        assert snap["external"]["completion_only"] is False
        assert snap["external"]["subject"]["slug"] == subject.slug

    async def test_publish_and_snapshot_completion_only(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        subject = await _ensure_subject(db)

        activity = Activity(
            kind="external",
            ref_id=new_id(),
            title="Beam Sculptor",
            subject_id=subject.id,
            status="draft",
            access="practice",
            config={"arcade_slug": "beam-sculptor", "completion_only": True},
        )
        db.add(activity)
        await db.flush()

        version = await publish_activity(db, activity, author=None, change_note="test")
        assert version.snapshot["external"]["completion_only"] is True

    async def test_student_get_returns_external_snapshot(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        subject = await _ensure_subject(db)

        activity = Activity(
            kind="external",
            ref_id=new_id(),
            title="Cell Defender",
            subject_id=subject.id,
            status="draft",
            access="practice",
            config={"arcade_slug": "cell-defender", "max_score": 5000},
        )
        db.add(activity)
        await db.flush()
        await publish_activity(db, activity, author=None, change_note="test")

        await register(client, email="student@example.edu")
        r = await client.get(f"/api/v1/activities/{activity.id}")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["kind"] == "external"
        assert body["snapshot"]["external"]["arcade_slug"] == "cell-defender"
        assert body["snapshot"]["external"]["max_score"] == 5000
        assert body["snapshot"]["external"]["completion_only"] is False


class TestExternalActivitySubmit:
    async def test_external_attempt_submit_records_clamped_score(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        activity = await _publish_external_activity(db)
        await register(client, email="student@example.edu")

        attempt = await _start_attempt(client, activity.id)
        r = await client.post(
            f"/api/v1/attempts/{attempt['id']}/submit",
            headers={"Idempotency-Key": "k1"},
            json={"score": 1200},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["score"] == 1200 and body["max_score"] == 5000
        assert body["percent"] == 24.0 and body["passed"] is None

        # A fresh attempt with an inflated score clamps to max_score, never exceeding 100%.
        attempt2 = await _start_attempt(client, activity.id)
        r = await client.post(
            f"/api/v1/attempts/{attempt2['id']}/submit",
            headers={"Idempotency-Key": "k2"},
            json={"score": 999999},
        )
        assert r.status_code == 200, r.text
        body2 = r.json()
        assert body2["score"] == 5000 and body2["max_score"] == 5000
        assert body2["percent"] == 100.0

    async def test_external_submit_requires_score_payload(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        activity = await _publish_external_activity(db)
        await register(client, email="student@example.edu")

        attempt = await _start_attempt(client, activity.id)
        r = await client.post(
            f"/api/v1/attempts/{attempt['id']}/submit", headers={"Idempotency-Key": "k1"}
        )
        assert r.status_code == 422

    async def test_score_payload_rejected_for_graded_kinds(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        activity = await import_any(db, QUIZ_DOC)
        await register(client)
        attempt = await _start_attempt(client, activity.id)
        r = await client.post(
            f"/api/v1/attempts/{attempt['id']}/submit",
            headers={"Idempotency-Key": "k1"},
            json={"score": 3},
        )
        assert r.status_code == 422

    async def test_completion_only_submit_records_null_scores(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        activity = await _publish_completion_only_activity(db)
        await register(client, email="student@example.edu")

        attempt = await _start_attempt(client, activity.id)
        r = await client.post(
            f"/api/v1/attempts/{attempt['id']}/submit", headers={"Idempotency-Key": "k1"}
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["score"] is None and body["max_score"] is None
        assert body["percent"] is None and body["passed"] is None
        assert body["status"] == "submitted"

        row = await db.scalar(
            select(ActivityResult).where(ActivityResult.activity_id == activity.id)
        )
        assert row is not None

    async def test_completion_only_rejects_score_payload(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        activity = await _publish_completion_only_activity(db)
        await register(client, email="student@example.edu")

        attempt = await _start_attempt(client, activity.id)
        r = await client.post(
            f"/api/v1/attempts/{attempt['id']}/submit",
            headers={"Idempotency-Key": "k1"},
            json={"score": 50},
        )
        assert r.status_code == 422

    async def test_external_submit_rejects_zero_max_config(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        activity = await _publish_external_activity(db, max_score=0)
        await register(client, email="student@example.edu")

        attempt = await _start_attempt(client, activity.id)
        r = await client.post(
            f"/api/v1/attempts/{attempt['id']}/submit",
            headers={"Idempotency-Key": "k1"},
            json={"score": 10},
        )
        assert r.status_code == 422

    async def test_external_submit_rejects_negative_score(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        activity = await _publish_external_activity(db)
        await register(client, email="student@example.edu")

        attempt = await _start_attempt(client, activity.id)
        r = await client.post(
            f"/api/v1/attempts/{attempt['id']}/submit",
            headers={"Idempotency-Key": "k1"},
            json={"score": -5},
        )
        assert r.status_code == 422

    async def test_scored_external_still_requires_payload(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        activity = await _publish_external_activity(db)
        await register(client, email="student@example.edu")

        attempt = await _start_attempt(client, activity.id)
        r = await client.post(
            f"/api/v1/attempts/{attempt['id']}/submit", headers={"Idempotency-Key": "k1"}
        )
        assert r.status_code == 422
