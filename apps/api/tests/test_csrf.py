from httpx import AsyncClient


async def test_wrong_origin_rejected(client: AsyncClient) -> None:
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "x@example.edu", "password": "password-123"},
        headers={"Origin": "https://evil.example"},
    )
    assert r.status_code == 403


async def test_matching_origin_allowed(client: AsyncClient) -> None:
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "x@example.edu", "password": "password-123"},
        headers={"Origin": "https://test"},
    )
    assert r.status_code == 401  # passed CSRF, failed auth (no such user)


async def test_get_ignores_origin(client: AsyncClient) -> None:
    r = await client.get("/api/v1/health", headers={"Origin": "https://evil.example"})
    assert r.status_code == 200


async def test_missing_origin_rejected_outside_test_env() -> None:
    """The env == "test" bypass must not leak into dev/prod."""
    from asgi_lifespan import LifespanManager
    from httpx import ASGITransport, AsyncClient

    from app.config import Settings
    from app.main import create_app
    from tests.conftest import TEST_DATABASE_URL

    app = create_app(
        Settings(database_url=TEST_DATABASE_URL, env="dev", public_origin="https://test")
    )
    transport = ASGITransport(app=app)
    async with LifespanManager(app), AsyncClient(transport=transport, base_url="https://test") as c:
        payload = {"email": "x@example.edu", "password": "password-123"}
        r = await c.post("/api/v1/auth/login", json=payload)
    assert r.status_code == 403
    assert r.headers["content-type"].startswith("application/problem+json")
