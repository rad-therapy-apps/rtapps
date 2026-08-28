"""What this file tests: `app.csrf.OriginCheckMiddleware` — the same-origin CSRF defense
applied to every unsafe HTTP method.

Used here and why: httpx AsyncClient against the ASGI app, with hand-set `Origin` headers,
including one test that builds its own app with `env="dev"` to check the test-only bypass
doesn't leak into other environments.

How it fits the project: protects ADR-0002 (same-origin proxy + cookie sessions) — since
sessions are ambient cookies with no CSRF token, the Origin check is the only thing
stopping a cross-site page from riding a logged-in user's cookie into a state-changing
request.

Works with: pytest-asyncio, httpx, asgi-lifespan.
Depends on: `client` fixture from `conftest.py` (built with `env="test"`); for the
env-leak test, `app.main.create_app`, `app.config.Settings`, and
`tests.conftest.TEST_DATABASE_URL` directly.
Used by: CI `api` job in `.github/workflows/pr.yml`; `make test-api`.
"""

from httpx import AsyncClient


async def test_wrong_origin_rejected(client: AsyncClient) -> None:
    """A POST with a foreign Origin header is rejected before it reaches the route handler."""
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "x@example.edu", "password": "password-123"},
        headers={"Origin": "https://evil.example"},
    )
    assert r.status_code == 403


async def test_matching_origin_allowed(client: AsyncClient) -> None:
    """An Origin matching public_origin clears the CSRF gate; the 401 proves it reached auth."""
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "x@example.edu", "password": "password-123"},
        headers={"Origin": "https://test"},
    )
    assert r.status_code == 401  # passed CSRF, failed auth (no such user)


async def test_get_ignores_origin(client: AsyncClient) -> None:
    """Safe methods (GET/HEAD/OPTIONS) are exempt from the Origin check entirely."""
    r = await client.get("/api/v1/health", headers={"Origin": "https://evil.example"})
    assert r.status_code == 200


async def test_missing_origin_rejected_outside_test_env() -> None:
    """The env == "test" bypass must not leak into dev/prod."""
    from asgi_lifespan import LifespanManager
    from httpx import ASGITransport, AsyncClient

    from app.config import Settings
    from app.main import create_app
    from tests.conftest import TEST_DATABASE_URL

    # env="dev" (not "test") so a request with no Origin header at all must still be
    # rejected — the missing-Origin bypass in OriginCheckMiddleware is test-only.
    app = create_app(
        Settings(database_url=TEST_DATABASE_URL, env="dev", public_origin="https://test")
    )
    transport = ASGITransport(app=app)
    async with LifespanManager(app), AsyncClient(transport=transport, base_url="https://test") as c:
        payload = {"email": "x@example.edu", "password": "password-123"}
        r = await c.post("/api/v1/auth/login", json=payload)
    assert r.status_code == 403
    assert r.headers["content-type"].startswith("application/problem+json")
