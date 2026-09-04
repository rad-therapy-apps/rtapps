"""What this file tests: the `external` activity kind (plan 4a) — model constraint,
snapshot shape, and (Task 2) the score-submit lifecycle.

Used here and why: mirrors test_calculator_activity.py's publish-then-read idiom; the
snapshot must embed arcade_slug/max_score from config at publish time. There is no
authoring route for `external` in 4a (Task 1 is API groundwork only), so the activity row
is created directly via the ORM instead of through an authoring endpoint.

How it fits the project: plan 4a §3 (player route contract), docs/03-architecture.md §6.5.
Depends on: `client`/`db` fixtures and `register` from `conftest.py`; `make_educator` from
`test_cohorts.py`; `app.content.service.publish_activity`.
Used by: CI `api` job; `make test-api`.
"""

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.content.models import Activity, Subject
from app.content.service import publish_activity
from app.ids import new_id
from tests.conftest import register
from tests.test_cohorts import make_educator


async def _ensure_subject(db: AsyncSession, slug: str = "radiation-biology") -> Subject:
    subject = await db.scalar(select(Subject).where(Subject.slug == slug))
    if subject is None:
        subject = Subject(slug=slug, title="Radiation Biology", order=1)
        db.add(subject)
        await db.flush()
    return subject


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
        assert snap["external"]["subject"]["slug"] == subject.slug

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
