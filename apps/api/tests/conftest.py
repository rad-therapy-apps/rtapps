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

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+asyncpg://rtapps:rtapps@localhost:5433/rtapps_test"
)


@pytest.fixture(scope="session")
def settings() -> Settings:
    return Settings(database_url=TEST_DATABASE_URL, env="test", public_origin="https://test")


@pytest.fixture(scope="session")
def monkeypatch_session() -> Iterator[pytest.MonkeyPatch]:
    mp = pytest.MonkeyPatch()
    yield mp
    mp.undo()


@pytest.fixture(scope="session")
def migrated_db(monkeypatch_session: pytest.MonkeyPatch) -> Iterator[None]:
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
    async with _make_client(settings, db) as c:
        yield c


@pytest.fixture
async def client_google(db: AsyncSession) -> AsyncIterator[AsyncClient]:
    google_settings = Settings(
        database_url=TEST_DATABASE_URL,
        env="test",
        public_origin="https://test",
        google_client_id="cid",
        google_client_secret="csecret",
    )
    async with _make_client(google_settings, db) as c:
        yield c


async def register(
    client: AsyncClient,
    email: str = "a@example.edu",
    password: str = "password-123",
    name: str = "Ada",
) -> dict[str, object]:
    r = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "display_name": name},
    )
    assert r.status_code == 201, r.text
    return cast(dict[str, object], r.json())


async def seed_lesson(db: AsyncSession, *, publish: bool = True) -> Lesson:
    doc = json.loads((Path(__file__).parent / "fixtures/lesson_min.json").read_text())
    return await import_lesson(db, LessonImport.model_validate(doc), publish=publish)
