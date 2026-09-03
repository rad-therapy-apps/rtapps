"""What this file tests: `GET/PUT /authoring/data-tables[...]` — the author-editable numeric
lookup tables (PDD/TMR/etc.) a calculator activity references by key. Covers the upsert's
200/201 split, list/get round trips, the `GridIn` validation matrix (ragged `values`,
non-ascending `cols`, non-ascending row `key`s), `updated_by` attribution, and one authz
spot-check.

Used here and why: `client`/`db` from `conftest.py`; `make_educator`/`register` matching
every other authoring test module's idiom.

How it fits the project: plan 3b Task 11 — data tables are Task 16's grid editor's backing
API and the source a calculator activity's snapshot embeds at publish time
(`app.content.activity_snapshots.build_activity_snapshot`'s calculator branch, covered in
`tests/test_calculator_activity.py`).

Works with: pytest-asyncio, httpx.
Depends on: `app.authoring.router`; `app.content.activity_models.DataTable`.
Used by: CI `api` job; `make test-api`.
"""

from typing import Any

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.content.activity_models import DataTable
from tests.conftest import register
from tests.test_cohorts import make_educator

GRID: dict[str, Any] = {
    "row_label": "Depth (cm)",
    "col_label": "Field size (cm)",
    "cols": [5, 10, 15],
    "rows": [
        {"key": 1.5, "values": [0.85, 0.90, 0.92]},
        {"key": 5.0, "values": [0.70, 0.78, 0.81]},
    ],
}


class TestDataTableUpsert:
    async def test_upsert_creates_then_updates(self, client: AsyncClient, db: AsyncSession) -> None:
        await make_educator(client, db, "edu@example.edu")
        created = await client.put(
            "/api/v1/authoring/data-tables/pdd-6mv",
            json={"title": "PDD 6MV", "grid": GRID},
        )
        assert created.status_code == 201, created.text
        body = created.json()
        assert body["key"] == "pdd-6mv"
        assert body["title"] == "PDD 6MV"
        assert body["grid"]["cols"] == [5, 10, 15]
        assert len(body["grid"]["rows"]) == 2

        updated = await client.put(
            "/api/v1/authoring/data-tables/pdd-6mv",
            json={
                "title": "PDD 6MV (revised)",
                "grid": {**GRID, "cols": [5, 10, 20]},
            },
        )
        assert updated.status_code == 200, updated.text
        assert updated.json()["title"] == "PDD 6MV (revised)"
        assert updated.json()["grid"]["cols"] == [5, 10, 20]
        assert updated.json()["key"] == "pdd-6mv"  # same row, not a second one

        got = await client.get("/api/v1/authoring/data-tables/pdd-6mv")
        assert got.status_code == 200, got.text
        assert got.json() == updated.json()

        listed = await client.get("/api/v1/authoring/data-tables")
        assert listed.status_code == 200, listed.text
        assert [t["key"] for t in listed.json()] == ["pdd-6mv"]

    async def test_upsert_records_updated_by(self, client: AsyncClient, db: AsyncSession) -> None:
        await make_educator(client, db, "edu@example.edu")
        r = await client.put(
            "/api/v1/authoring/data-tables/pdd-6mv", json={"title": "PDD 6MV", "grid": GRID}
        )
        assert r.status_code == 201, r.text
        educator = await db.scalar(select(User).where(User.email == "edu@example.edu"))
        assert educator is not None
        table = await db.scalar(select(DataTable).where(DataTable.key == "pdd-6mv"))
        assert table is not None and table.updated_by == educator.id

    async def test_get_unknown_key_404(self, client: AsyncClient, db: AsyncSession) -> None:
        await make_educator(client, db, "edu@example.edu")
        r = await client.get("/api/v1/authoring/data-tables/no-such-key")
        assert r.status_code == 404

    async def test_upsert_student_403(self, client: AsyncClient, db: AsyncSession) -> None:
        await register(client)
        r = await client.put(
            "/api/v1/authoring/data-tables/pdd-6mv", json={"title": "PDD 6MV", "grid": GRID}
        )
        assert r.status_code == 403


class TestGridValidation:
    async def _put(self, client: AsyncClient, grid: dict[str, Any]) -> int:
        r = await client.put(
            "/api/v1/authoring/data-tables/some-table", json={"title": "T", "grid": grid}
        )
        return r.status_code

    async def test_happy_path_201(self, client: AsyncClient, db: AsyncSession) -> None:
        await make_educator(client, db, "edu@example.edu")
        assert await self._put(client, GRID) == 201

    async def test_ragged_values_422(self, client: AsyncClient, db: AsyncSession) -> None:
        await make_educator(client, db, "edu@example.edu")
        bad = {**GRID, "rows": [{"key": 1.5, "values": [0.85, 0.90]}]}  # 2 values, 3 cols
        assert await self._put(client, bad) == 422

    async def test_non_ascending_cols_422(self, client: AsyncClient, db: AsyncSession) -> None:
        await make_educator(client, db, "edu@example.edu")
        bad = {**GRID, "cols": [10, 5, 15]}
        assert await self._put(client, bad) == 422

    async def test_duplicate_cols_422(self, client: AsyncClient, db: AsyncSession) -> None:
        await make_educator(client, db, "edu@example.edu")
        bad = {**GRID, "cols": [5, 5, 15]}
        assert await self._put(client, bad) == 422

    async def test_non_ascending_row_keys_422(self, client: AsyncClient, db: AsyncSession) -> None:
        await make_educator(client, db, "edu@example.edu")
        bad = {
            **GRID,
            "rows": [
                {"key": 5.0, "values": [0.70, 0.78, 0.81]},
                {"key": 1.5, "values": [0.85, 0.90, 0.92]},
            ],
        }
        assert await self._put(client, bad) == 422

    async def test_duplicate_row_keys_422(self, client: AsyncClient, db: AsyncSession) -> None:
        await make_educator(client, db, "edu@example.edu")
        bad = {
            **GRID,
            "rows": [
                {"key": 1.5, "values": [0.85, 0.90, 0.92]},
                {"key": 1.5, "values": [0.70, 0.78, 0.81]},
            ],
        }
        assert await self._put(client, bad) == 422

    async def test_empty_cols_422(self, client: AsyncClient, db: AsyncSession) -> None:
        await make_educator(client, db, "edu@example.edu")
        bad = {**GRID, "cols": [], "rows": [{"key": 1.5, "values": []}]}
        assert await self._put(client, bad) == 422

    async def test_empty_rows_422(self, client: AsyncClient, db: AsyncSession) -> None:
        await make_educator(client, db, "edu@example.edu")
        bad = {**GRID, "rows": []}
        assert await self._put(client, bad) == 422

    async def test_nan_in_cols_422(self, client: AsyncClient, db: AsyncSession) -> None:
        await make_educator(client, db, "edu@example.edu")
        # Send raw JSON with NaN token to exercise Pydantic validation
        r = await client.put(
            "/api/v1/authoring/data-tables/some-table",
            content='{"title":"T","grid":{"row_label":"d","col_label":"f","cols":[1.0,NaN],"rows":[{"key":1.0,"values":[1.0,2.0]}]}}',
            headers={"content-type": "application/json"},
        )
        assert r.status_code == 422, r.text

    async def test_nan_in_row_key_422(self, client: AsyncClient, db: AsyncSession) -> None:
        await make_educator(client, db, "edu@example.edu")
        # Send raw JSON with NaN in row key
        r = await client.put(
            "/api/v1/authoring/data-tables/some-table",
            content='{"title":"T","grid":{"row_label":"d","col_label":"f","cols":[1.0,2.0],"rows":[{"key":NaN,"values":[1.0,2.0]}]}}',
            headers={"content-type": "application/json"},
        )
        assert r.status_code == 422, r.text

    async def test_nan_in_row_values_422(self, client: AsyncClient, db: AsyncSession) -> None:
        await make_educator(client, db, "edu@example.edu")
        # Send raw JSON with NaN in row values
        r = await client.put(
            "/api/v1/authoring/data-tables/some-table",
            content='{"title":"T","grid":{"row_label":"d","col_label":"f","cols":[1.0,2.0],"rows":[{"key":1.0,"values":[NaN,2.0]}]}}',
            headers={"content-type": "application/json"},
        )
        assert r.status_code == 422, r.text
