"""Application factory and ASGI entry point for the FastAPI API.

What this file does: builds the FastAPI app (`create_app`), wires up the database engine on
startup/shutdown (`lifespan`), installs the error handlers and the CSRF `Origin`-check
middleware, and mounts every route group under `/api/v1`; `app` is the module-level
instance Uvicorn serves.

Used here and why: FastAPI's `lifespan` context manager creates the async engine once per
process and disposes it cleanly on shutdown, rather than per request; `create_app` takes an
optional `Settings` so tests can build an app against a test database without touching the
process-wide cached settings.

How it fits the project: this is the `api` container from `docs/03-architecture.md` §3 —
the top of the request flow (proxy routes `/*` to `web` for pages, `/api/*` to this app for
data). Interactive docs (`/api/v1/docs`, `/api/v1/openapi.json`) are disabled in prod.

Depends on: `app.admin.router`, `app.health`, `app.analytics.router`, `app.attempts.router`,
`app.auth.router`, `app.cohorts.router`, `app.config`, `app.content.router`,
`app.csrf.OriginCheckMiddleware`, `app.db`, `app.errors`, `app.media.router`.
Used by: `app.openapi_export` (`create_app`); `tests/conftest.py` (`client` fixture);
served directly by Uvicorn (`app.main:app`) in dev/prod.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI

from app import health
from app.admin.router import router as admin_router
from app.analytics.router import router as analytics_router
from app.attempts.router import router as attempts_router
from app.auth.router import router as auth_router
from app.cohorts.router import router as cohorts_router
from app.config import Settings, load_settings
from app.content.router import router as content_router
from app.csrf import OriginCheckMiddleware
from app.db import get_engine, make_session_factory
from app.errors import install_error_handlers
from app.media.router import router as media_router

API_PREFIX = "/api/v1"  # every route group below is mounted under this prefix (URL versioning)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Runs once at process startup/shutdown: create the async engine and session factory
    # here (not at import time) so each app instance (including per-test apps) gets its own
    # engine, and dispose the engine on shutdown to close pooled connections cleanly.
    settings: Settings = app.state.settings
    engine = get_engine(settings)
    app.state.engine = engine
    app.state.session_factory = make_session_factory(engine)
    try:
        yield
    finally:
        await engine.dispose()


def create_app(settings: Settings | None = None) -> FastAPI:
    # settings defaults to the process-wide cached Settings, but callers (tests,
    # app/openapi_export.py) can pass their own to point at a different database/env.
    settings = settings or load_settings()
    if settings.sentry_dsn:
        # Opt-in (blank dsn = no-op): errors only, no performance tracing/sampling.
        sentry_sdk.init(dsn=settings.sentry_dsn, environment=settings.env)
    docs_enabled = settings.env != "prod"  # hide interactive docs/schema in production
    app = FastAPI(
        title="RTApps API",
        version="0.3.0",
        lifespan=lifespan,
        openapi_url=f"{API_PREFIX}/openapi.json" if docs_enabled else None,
        docs_url=f"{API_PREFIX}/docs" if docs_enabled else None,
        redoc_url=None,
    )
    app.state.settings = settings  # read back by app.config.get_settings and lifespan above
    install_error_handlers(app)
    app.add_middleware(OriginCheckMiddleware, settings=settings)
    app.include_router(health.router, prefix=API_PREFIX)
    app.include_router(auth_router, prefix=API_PREFIX)
    app.include_router(content_router, prefix=API_PREFIX)
    app.include_router(attempts_router, prefix=API_PREFIX)
    app.include_router(cohorts_router, prefix=API_PREFIX)
    app.include_router(analytics_router, prefix=API_PREFIX)
    app.include_router(admin_router, prefix=API_PREFIX)
    app.include_router(media_router, prefix=API_PREFIX)
    return app


app = create_app()  # module-level instance Uvicorn serves (e.g. `uvicorn app.main:app`)
