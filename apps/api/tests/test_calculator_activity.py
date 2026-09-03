"""What this file tests: `POST/GET/PUT /authoring/calculators` (Task 11's builder for the
calculator activity kind) and the calculator branch of
`app.content.activity_snapshots.build_activity_snapshot` — snapshot embedding of a
referenced `DataTable` at publish time (with pinning against later table edits), the
missing-table 422, the student-facing GET (grid intact, nothing stripped, since a grid
isn't an answer), and the attempts-guard 409.

Used here and why: `client`/`db` from `conftest.py`; `make_educator`/`register` matching
every other authoring test module's idiom; `app.content.service.publish_activity` to drive
a publish directly, the same idiom `test_authoring_builders.py`'s own pinning test uses.

How it fits the project: plan 3b Task 11. Task 16 (grid editor) and Task 17 (MU player +
student route) consume these endpoints and this snapshot shape.

Works with: pytest-asyncio, httpx.
Depends on: `app.authoring.router`; `app.content.activity_models.DataTable`;
`app.content.models` (Activity, ContentVersion, Subject); `app.content.service.publish_activity`.
Used by: CI `api` job; `make test-api`.
"""

import uuid
from typing import Any

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.content.models import Activity, ContentVersion, Subject
from app.content.service import publish_activity
from tests.conftest import register
from tests.test_cohorts import make_educator

GRID: dict[str, Any] = {
    "row_label": "Depth (cm)",
    "col_label": "Field size (cm)",
    "cols": [5, 10],
    "rows": [{"key": 1.5, "values": [0.85, 0.90]}],
}


async def _ensure_subject(db: AsyncSession, slug: str = "radiation-biology") -> None:
    if await db.scalar(select(Subject.id).where(Subject.slug == slug)) is None:
        db.add(Subject(slug=slug, title="Radiation Biology", order=1))
        await db.flush()


async def _create_draft_lesson(client: AsyncClient, db: AsyncSession) -> dict[str, Any]:
    """A minimal draft lesson, used only as an off-kind activity id for a mismatch check."""
    await _ensure_subject(db)
    r = await client.post(
        "/api/v1/authoring/lessons",
        json={"subject_slug": "radiation-biology", "title": "A Lesson", "slug": "a-lesson"},
    )
    assert r.status_code == 201, r.text
    body: dict[str, Any] = r.json()
    return body


async def _put_table(client: AsyncClient, key: str = "pdd-6mv", title: str = "PDD 6MV") -> None:
    r = await client.put(
        f"/api/v1/authoring/data-tables/{key}", json={"title": title, "grid": GRID}
    )
    assert r.status_code in (200, 201), r.text


async def _create_calculator(
    client: AsyncClient, db: AsyncSession, *, data_tables: list[str] | None = None
) -> dict[str, Any]:
    await _ensure_subject(db)
    r = await client.post(
        "/api/v1/authoring/calculators",
        json={
            "subject_slug": "radiation-biology",
            "title": "MU Calculator",
            "calc_type": "mu",
            "data_tables": data_tables if data_tables is not None else ["pdd-6mv"],
        },
    )
    assert r.status_code == 201, r.text
    body: dict[str, Any] = r.json()
    return body


class TestCalculatorBuilder:
    async def test_create_has_no_working_copy_row_and_get_round_trips(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        await _put_table(client)
        calc = await _create_calculator(client, db)
        assert calc["status"] == "draft"
        assert calc["subject_slug"] == "radiation-biology"
        assert calc["calc_type"] == "mu"
        assert calc["data_tables"] == ["pdd-6mv"]
        uuid.UUID(calc["activity_id"])

        activity = await db.get(Activity, uuid.UUID(calc["activity_id"]))
        assert activity is not None and activity.kind == "calculator"
        assert activity.config == {"calc_type": "mu", "data_tables": ["pdd-6mv"]}
        assert activity.access == "practice"

        got = await client.get(f"/api/v1/authoring/calculators/{calc['activity_id']}")
        assert got.status_code == 200, got.text
        assert got.json() == calc

    async def test_put_replaces_content(self, client: AsyncClient, db: AsyncSession) -> None:
        await make_educator(client, db, "edu@example.edu")
        await _put_table(client, "pdd-6mv")
        await _put_table(client, "tmr-6mv", "TMR 6MV")
        calc = await _create_calculator(client, db)
        r = await client.put(
            f"/api/v1/authoring/calculators/{calc['activity_id']}",
            json={"title": "MU Calculator v2", "calc_type": "mu", "data_tables": ["tmr-6mv"]},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["title"] == "MU Calculator v2"
        assert body["data_tables"] == ["tmr-6mv"]

        got = await client.get(f"/api/v1/authoring/calculators/{calc['activity_id']}")
        assert got.json() == body

    async def test_create_rejects_unknown_calc_type(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        await _ensure_subject(db)
        r = await client.post(
            "/api/v1/authoring/calculators",
            json={
                "subject_slug": "radiation-biology",
                "title": "Bad",
                "calc_type": "not-a-real-type",
                "data_tables": [],
            },
        )
        assert r.status_code == 422, r.text

    async def test_get_kind_mismatch_404_for_lesson_activity(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        lesson = await _create_draft_lesson(client, db)
        r = await client.get(f"/api/v1/authoring/calculators/{lesson['activity_id']}")
        assert r.status_code == 404

    async def test_create_student_403(self, client: AsyncClient, db: AsyncSession) -> None:
        await _ensure_subject(db)
        await register(client)
        r = await client.post(
            "/api/v1/authoring/calculators",
            json={
                "subject_slug": "radiation-biology",
                "title": "X",
                "calc_type": "mu",
                "data_tables": [],
            },
        )
        assert r.status_code == 403


class TestCalculatorSnapshot:
    async def test_publish_embeds_table_and_pins_against_later_edits(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        await _put_table(client)
        calc = await _create_calculator(client, db)
        activity = await db.get(Activity, uuid.UUID(calc["activity_id"]))
        assert activity is not None
        await publish_activity(db, activity, author=None, change_note="test publish")

        published = await client.get(f"/api/v1/activities/{calc['activity_id']}")
        assert published.status_code == 200, published.text
        snap = published.json()["snapshot"]
        assert snap["activity"]["kind"] == "calculator"
        assert snap["calculator"]["calc_type"] == "mu"
        assert snap["calculator"]["data_tables"]["pdd-6mv"]["title"] == "PDD 6MV"
        assert snap["calculator"]["data_tables"]["pdd-6mv"]["grid"]["cols"] == [5, 10]

        # Edit the DataTable after publish: the frozen snapshot must NOT change (pinning),
        # same guarantee test_authoring_builders.py proves for a quiz's questions.
        edited_grid = {
            **GRID,
            "cols": [5, 10, 20],
            "rows": [{"key": 1.5, "values": [0.85, 0.90, 0.95]}],
        }
        r = await client.put(
            "/api/v1/authoring/data-tables/pdd-6mv",
            json={"title": "PDD 6MV (edited)", "grid": edited_grid},
        )
        assert r.status_code == 200, r.text

        still_published = await client.get(f"/api/v1/activities/{calc['activity_id']}")
        still_snap = still_published.json()["snapshot"]
        assert still_snap["calculator"]["data_tables"]["pdd-6mv"]["title"] == "PDD 6MV"
        assert still_snap["calculator"]["data_tables"]["pdd-6mv"]["grid"]["cols"] == [5, 10]

    async def test_student_get_returns_grid_unstripped(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        """Grids are not answers: the student-facing snapshot carries the full grid, unlike
        a quiz's stripped answer key."""
        await make_educator(client, db, "edu@example.edu")
        await _put_table(client)
        calc = await _create_calculator(client, db)
        activity = await db.get(Activity, uuid.UUID(calc["activity_id"]))
        assert activity is not None
        await publish_activity(db, activity, author=None)

        await register(client, email="student@example.edu")
        r = await client.get(f"/api/v1/activities/{calc['activity_id']}")
        assert r.status_code == 200, r.text
        data_tables = r.json()["snapshot"]["calculator"]["data_tables"]
        assert data_tables["pdd-6mv"]["grid"]["rows"][0]["values"] == [0.85, 0.90]

    async def test_publish_with_missing_table_key_422(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        # Reference a data-table key that has never been created.
        calc = await _create_calculator(client, db, data_tables=["no-such-table"])
        r = await client.post(
            f"/api/v1/authoring/activities/{calc['activity_id']}/publish", json={}
        )
        assert r.status_code == 422, r.text

        activity = await db.get(Activity, uuid.UUID(calc["activity_id"]))
        assert activity is not None and activity.status == "draft"
        version = await db.scalar(
            select(ContentVersion).where(ContentVersion.activity_id == activity.id)
        )
        assert version is None

    async def test_preview_with_missing_table_key_422(
        self, client: AsyncClient, db: AsyncSession
    ) -> None:
        await make_educator(client, db, "edu@example.edu")
        # Reference a data-table key that has never been created.
        calc = await _create_calculator(client, db, data_tables=["no-such-table"])
        r = await client.get(f"/api/v1/authoring/activities/{calc['activity_id']}/preview")
        assert r.status_code == 422, r.text

    async def test_attempt_start_409(self, client: AsyncClient, db: AsyncSession) -> None:
        await make_educator(client, db, "edu@example.edu")
        await _put_table(client)
        calc = await _create_calculator(client, db)
        activity = await db.get(Activity, uuid.UUID(calc["activity_id"]))
        assert activity is not None
        await publish_activity(db, activity, author=None)

        await register(client, email="student@example.edu")
        r = await client.post(f"/api/v1/activities/{calc['activity_id']}/attempts")
        assert r.status_code == 409, r.text
