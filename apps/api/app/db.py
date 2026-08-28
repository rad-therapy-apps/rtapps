"""Database engine, session factory, and the SQLAlchemy declarative base.

What this file does: builds the async SQLAlchemy engine and session factory from
`Settings.database_url`, defines the `Base` all ORM models inherit from, and provides the
`get_session` FastAPI dependency used by every route that touches the database.

Used here and why: SQLAlchemy 2's async engine/session (`asyncpg` driver) so route
handlers can `await` database calls without blocking the event loop; `expire_on_commit`
is disabled so ORM objects returned from a route stay readable after the commit that
persisted them, without an extra round-trip refresh.

How it fits the project: per ADR-0001, this is the one place the SQLAlchemy async
plumbing is set up; `app/main.py` creates the engine/session factory at startup and stores
them on `app.state`, then disposes the engine on shutdown.

Depends on: `app.config.Settings`.
Used by: `app/main.py`, `app/health.py`, `app/seed.py`, `app/auth/models.py` (Base),
`app/auth/deps.py`, `app/auth/router.py`, `app/content/importer.py`, `app/content/models.py`,
`app/content/router.py`, `app/attempts/models.py`, `app/attempts/router.py`,
`alembic/env.py`.
"""

from collections.abc import AsyncIterator

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import Settings


class Base(DeclarativeBase):
    # Shared declarative base; every ORM model (User, Session, Lesson, Attempt, ...)
    # inherits from this so Alembic's autogenerate can see them all via one metadata object.
    pass


def get_engine(settings: Settings) -> AsyncEngine:
    # pool_pre_ping checks a pooled connection is still alive before reusing it, so a
    # connection dropped by the database (e.g. an idle timeout) surfaces as a fresh
    # reconnect rather than a query error.
    return create_async_engine(settings.database_url, pool_pre_ping=True)


def make_session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    # expire_on_commit=False: ORM attributes stay accessible after commit, so a route can
    # commit and then return the same object as a Pydantic response_model without SQLAlchemy
    # trying to re-fetch it first.
    return async_sessionmaker(engine, expire_on_commit=False)


def _factory_from_request(request: Request) -> async_sessionmaker[AsyncSession]:
    # The session factory is created once at app startup (see app/main.py's lifespan) and
    # stashed on app.state; this just retrieves it for the get_session dependency below.
    factory: async_sessionmaker[AsyncSession] = request.app.state.session_factory
    return factory


async def get_session(
    factory: async_sessionmaker[AsyncSession] = Depends(_factory_from_request),
) -> AsyncIterator[AsyncSession]:
    # FastAPI dependency: yields one AsyncSession per request, closed automatically when
    # the request finishes, whether the route committed, rolled back, or raised.
    async with factory() as session:
        yield session
