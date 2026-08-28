"""What this file tests: `app/errors.py` (RFC 7807 problem+json error responses) and
`app/main.create_app`'s docs-disabling behaviour in prod.

Used here and why: httpx AsyncClient against the ASGI app for the error-format check;
building a prod `Settings`/app directly for the docs-disabled check (no HTTP call needed).

How it fits the project: every error response across the API — auth, content, attempts —
goes through this same `problem_response`/exception-handler machinery, so its shape is
tested once here rather than re-asserted in every route's test file.

Works with: pytest-asyncio, httpx.
Depends on: `client` fixture from `conftest.py`; `app.errors`, `app.config.Settings`,
`app.main.create_app`.
Used by: CI `api` job in `.github/workflows/pr.yml`; `make test-api`.
"""

from httpx import AsyncClient


async def test_404_is_problem_json(client: AsyncClient) -> None:
    """An unmatched route returns application/problem+json with a matching numeric status."""
    r = await client.get("/api/v1/does-not-exist")
    assert r.status_code == 404
    assert r.headers["content-type"].startswith("application/problem+json")
    assert r.json()["status"] == 404


async def test_docs_disabled_in_prod() -> None:
    """create_app(env="prod") must not expose an OpenAPI/docs URL at all."""
    from app.config import Settings
    from app.main import create_app

    app = create_app(Settings(env="prod", session_secret="x" * 32))
    assert app.openapi_url is None
