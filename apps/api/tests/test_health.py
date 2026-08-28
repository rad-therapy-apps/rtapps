"""What this file tests: `app/health.py` — the /health endpoint used for liveness checks.

Used here and why: httpx AsyncClient against the ASGI app — confirms the route can reach
the real test database, not just that the route exists.

How it fits the project: this is the endpoint infra/compose.yaml and any deployment
tooling would poll to confirm the API and its database connection are both up.

Works with: pytest-asyncio, httpx.
Depends on: `client` fixture from `conftest.py`; `app.health`.
Used by: CI `api` job in `.github/workflows/pr.yml`; `make test-api`.
"""

from httpx import AsyncClient


async def test_health_reports_database_ok(client: AsyncClient) -> None:
    """/health round-trips a real query against the database and reports both as ok."""
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}
