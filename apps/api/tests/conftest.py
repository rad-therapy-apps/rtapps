"""Shared pytest fixtures and helpers for the whole `apps/api/tests` suite.

What this file tests: nothing directly — it wires up the database, the ASGI app, and an
HTTP client that every test module in this package depends on.

Used here and why:
- alembic's `command.downgrade`/`command.upgrade` to put a real Postgres schema through
  its actual migration path once per test session, instead of `Base.metadata.create_all`,
  so migration bugs are caught the same way `test_migrations.py` catches them.
- A single connection + outer transaction per test, with
  `join_transaction_mode="create_savepoint"`: app code is free to call `db.commit()` (real
  route handlers do this) and it only closes an inner SAVEPOINT, because the outer
  transaction opened by the `db` fixture is never committed — it's rolled back at
  teardown. This is what makes every test start from a clean database without re-running
  migrations or truncating tables.
- httpx `AsyncClient` over `ASGITransport` (no real network/socket) with
  `base_url="https://test"`: the session cookie is `Secure` whenever `env != "dev"` (see
  `app.auth.deps.set_session_cookie`), so the base URL must be `https://` or the client
  would silently drop the cookie and every "am I logged in" assertion downstream would
  fail for the wrong reason.
- `env="test"` on the `Settings` fixture relaxes `OriginCheckMiddleware` (see
  `app/csrf.py`) so a same-origin request without an `Origin` header is not rejected —
  httpx doesn't send one by default. `test_csrf.py` covers the boundary of this bypass
  directly, and asserts it does not extend to `env="dev"`/`"prod"`.

How it fits the project: this is the foundation every other test file in this directory
builds on (ADR-0002 cookie sessions, ADR-0003 content model, ADR-0004 attempt schema).

Works with: pytest, pytest-asyncio (implicit, via project config), alembic, sqlalchemy
asyncio, asgi-lifespan, httpx.
Depends on: `alembic.ini` and the migrations under `alembic/versions/`; `app.main.create_app`;
`app.content.importer.import_lesson`; `tests/fixtures/lesson_min.json`.
Used by: every test module in this directory (via the `db`/`client`/`client_google`
fixtures and the `register`/`seed_lesson` helpers); CI `api` job in
`.github/workflows/pr.yml`; `make test-api`.
"""

import json
import os
from collections.abc import AsyncIterator, Iterator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import cast

import pytest
from alembic.config import Config
from asgi_lifespan import LifespanManager
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from alembic import command
from app.config import Settings
from app.content.importer import LessonImport, import_lesson
from app.content.models import Lesson
from app.main import create_app

# CI's postgres service (see .github/workflows/pr.yml) publishes 5433; the docker-compose
# dev database used when running tests locally instead binds 5434 (see infra/compose.yaml),
# so a developer must override TEST_DATABASE_URL to point at their own instance.
TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+asyncpg://rtapps:rtapps@localhost:5433/rtapps_test"
)


@pytest.fixture(scope="session")
def settings() -> Settings:
    # https://test (not http) so Secure cookies set by the app survive the round trip.
    return Settings(
        database_url=TEST_DATABASE_URL,
        env="test",
        public_origin="https://test",
        rate_limit_enabled=False,
    )


@pytest.fixture(scope="session")
def monkeypatch_session() -> Iterator[pytest.MonkeyPatch]:
    """Session-scoped MonkeyPatch: pytest's built-in `monkeypatch` is function-scoped only."""
    mp = pytest.MonkeyPatch()
    yield mp
    mp.undo()


@pytest.fixture(scope="session")
def migrated_db(monkeypatch_session: pytest.MonkeyPatch) -> Iterator[None]:
    """Reset the schema once per test session by replaying every migration from scratch.

    Downgrading to "base" then upgrading to "head" (rather than trusting whatever state
    the database is already in) means a stale or partially-migrated local database can't
    produce a false pass, and it exercises the same migration chain `test_migrations.py`
    checks the head revision of.
    """
    monkeypatch_session.setenv("DATABASE_URL", TEST_DATABASE_URL)
    cfg = Config("alembic.ini")
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")
    yield


@pytest.fixture
async def engine(migrated_db: None) -> AsyncIterator[AsyncEngine]:
    eng = create_async_engine(TEST_DATABASE_URL)
    yield eng
    await eng.dispose()


@pytest.fixture
async def db(engine: AsyncEngine) -> AsyncIterator[AsyncSession]:
    """One connection, one outer transaction, rolled back after the test."""
    async with engine.connect() as conn:
        trans = await conn.begin()
        # create_savepoint: app code's own `session.commit()` calls become nested
        # SAVEPOINT release/rollback instead of committing the outer transaction, so
        # nothing a test (or the route it calls) commits ever survives past `trans.rollback()`.
        factory = async_sessionmaker(
            bind=conn, expire_on_commit=False, join_transaction_mode="create_savepoint"
        )
        async with factory() as session:
            yield session
        await trans.rollback()


@asynccontextmanager
async def _make_client(settings: Settings, db: AsyncSession) -> AsyncIterator[AsyncClient]:
    app = create_app(settings)
    async with LifespanManager(app):
        # Route every request's session onto the test's connection/transaction.
        app.state.session_factory = async_sessionmaker(
            bind=db.bind, expire_on_commit=False, join_transaction_mode="create_savepoint"
        )
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="https://test") as c:
            yield c


@pytest.fixture
async def client(settings: Settings, db: AsyncSession) -> AsyncIterator[AsyncClient]:
    """Plain client: no Google OAuth configured, so `/auth/google/*` routes 404."""
    async with _make_client(settings, db) as c:
        yield c


@pytest.fixture
async def client_google(db: AsyncSession) -> AsyncIterator[AsyncClient]:
    """Client whose Settings carry a Google client id/secret, enabling the OAuth routes."""
    google_settings = Settings(
        database_url=TEST_DATABASE_URL,
        env="test",
        public_origin="https://test",
        google_client_id="cid",
        google_client_secret="csecret",
        rate_limit_enabled=False,
    )
    async with _make_client(google_settings, db) as c:
        yield c


async def register(
    client: AsyncClient,
    email: str = "a@example.edu",
    password: str = "password-123",
    name: str = "Ada",
) -> dict[str, object]:
    """Register a student and leave the session cookie on `client` for subsequent calls."""
    r = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "display_name": name},
    )
    assert r.status_code == 201, r.text
    return cast(dict[str, object], r.json())


async def seed_lesson(db: AsyncSession, *, publish: bool = True) -> Lesson:
    """Import the minimal fixture lesson (one knowledge check) through the real importer."""
    doc = json.loads((Path(__file__).parent / "fixtures/lesson_min.json").read_text())
    return await import_lesson(db, LessonImport.model_validate(doc), publish=publish)
