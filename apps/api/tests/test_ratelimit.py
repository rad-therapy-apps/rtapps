"""What this file tests: per-IP token-bucket rate limiting (NFR-13) on login, register, and
cohort join — 10 requests per minute per IP, a 429 problem+json past the limit, separate
buckets per IP (`X-Forwarded-For`), and that `rate_limit_enabled=False` (the shared `client`
fixture's setting) never limits.

Used here and why: a `limited_client` fixture (`rate_limit_enabled=True`) alongside the
shared `client` fixture, and an autouse `reset_rate_limits` fixture so buckets from one
test never leak into the next.

How it fits the project: protects NFR-13 — per-IP rate limiting on the auth/join endpoints,
implemented as the in-process token bucket in `app.ratelimit`.

Works with: pytest-asyncio, httpx.
Depends on: `client`, `db` fixtures and the `register` helper from `conftest.py`;
`app.ratelimit.reset`.
Used by: CI `api` job in `.github/workflows/pr.yml`; `make test-api`.
"""

from collections.abc import AsyncIterator

import pytest
from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User, UserRole
from app.config import Settings
from app.main import create_app
from app.ratelimit import reset as reset_ratelimit
from tests.conftest import TEST_DATABASE_URL, make_client, register

# Bad login credentials that trigger 401 (combined check: no user/no password/wrong password)
BAD_LOGIN = {"email": "nonexistent@example.edu", "password": "wrong"}


async def promote(db: AsyncSession, email: str, role: UserRole) -> None:
    """Set a registered user's role directly (the admin route is covered in test_admin.py)."""
    await db.execute(update(User).where(User.email == email).values(role=role))
    await db.flush()


@pytest.fixture(autouse=True)
async def reset_rate_limits() -> None:
    """Clear rate limiting state before each test in this module."""
    reset_ratelimit()


@pytest.fixture
async def limited_client(db) -> AsyncIterator[AsyncClient]:
    """Client with rate limiting enabled (unlike the shared `client` fixture)."""
    limited_settings = Settings(
        database_url=TEST_DATABASE_URL,
        env="test",
        public_origin="https://test",
        rate_limit_enabled=True,
    )
    async with make_client(create_app(limited_settings), db) as c:
        yield c


async def test_login_rate_limited_per_ip(limited_client: AsyncClient) -> None:
    """First 10 login attempts return 401; the 11th returns 429."""
    for i in range(10):
        r = await limited_client.post("/api/v1/auth/login", json=BAD_LOGIN)
        assert r.status_code == 401, f"Request {i + 1} should be 401, got {r.status_code}"
    # 11th attempt should be rate-limited
    r = await limited_client.post("/api/v1/auth/login", json=BAD_LOGIN)
    assert r.status_code == 429
    assert r.headers["content-type"].startswith("application/problem+json")
    body = r.json()
    assert body["title"] == "Too many requests"


async def test_register_rate_limited_per_ip(limited_client: AsyncClient) -> None:
    """First 10 register attempts return 201/409; the 11th returns 429."""
    for i in range(10):
        r = await limited_client.post(
            "/api/v1/auth/register",
            json={
                "email": f"user{i}@example.edu",
                "password": "password-123",
                "display_name": f"User {i}",
            },
        )
        # Status can be 201 (created) or 409 (duplicate) depending on race, but not 429
        assert r.status_code in (201, 409), f"Request {i + 1}: got {r.status_code}"
    # 11th attempt should be rate-limited before any other checks
    r = await limited_client.post(
        "/api/v1/auth/register",
        json={
            "email": "user11@example.edu",
            "password": "password-123",
            "display_name": "User 11",
        },
    )
    assert r.status_code == 429
    assert r.headers["content-type"].startswith("application/problem+json")


async def test_join_endpoint_rate_limited_per_ip(
    client: AsyncClient, limited_client: AsyncClient, db: AsyncSession
) -> None:
    """First 10 join attempts return various statuses; the 11th returns 429."""
    # Register educator on shared client, promote to educator, and create a cohort
    await register(client, email="educator@example.edu", password="password-123")
    await promote(db, "educator@example.edu", UserRole.educator)
    cohort_resp = await client.post(
        "/api/v1/cohorts",
        json={
            "name": "Test Cohort",
            "threshold_percent": 70,
            "starts_on": "2024-01-01",
            "ends_on": "2024-12-31",
        },
    )
    assert cohort_resp.status_code == 201
    join_code = cohort_resp.json()["join_code"]

    # Register student on limited_client
    await register(limited_client, email="joiner@example.edu", password="password-123")

    # Make 10 join attempts with the limited client (same IP)
    for i in range(10):
        r = await limited_client.post(
            "/api/v1/cohorts/join",
            json={"code": join_code},
        )
        # Status can be 200 (success) or 409 (already member) but not 429
        assert r.status_code in (200, 409), f"Request {i + 1}: got {r.status_code}"

    # 11th attempt should be rate-limited
    r = await limited_client.post(
        "/api/v1/cohorts/join",
        json={"code": join_code},
    )
    assert r.status_code == 429
    assert r.headers["content-type"].startswith("application/problem+json")


async def test_limits_are_per_ip(limited_client: AsyncClient) -> None:
    """Different X-Forwarded-For headers get separate rate limit buckets."""
    # Make 10 requests from IP 1
    for _ in range(10):
        r = await limited_client.post(
            "/api/v1/auth/login",
            json=BAD_LOGIN,
            headers={"X-Forwarded-For": "192.168.1.1"},
        )
        assert r.status_code == 401

    # 11th from IP 1 should be rate-limited
    r = await limited_client.post(
        "/api/v1/auth/login",
        json=BAD_LOGIN,
        headers={"X-Forwarded-For": "192.168.1.1"},
    )
    assert r.status_code == 429

    # But a fresh IP should have a fresh bucket
    r = await limited_client.post(
        "/api/v1/auth/login",
        json=BAD_LOGIN,
        headers={"X-Forwarded-For": "192.168.1.2"},
    )
    assert r.status_code == 401


async def test_disabled_in_test_settings(client: AsyncClient) -> None:
    """The shared `client` fixture (rate_limit_enabled=False) never 429s."""
    for i in range(15):
        r = await client.post("/api/v1/auth/login", json=BAD_LOGIN)
        assert r.status_code == 401, f"Request {i + 1}: expected 401, got {r.status_code}"
