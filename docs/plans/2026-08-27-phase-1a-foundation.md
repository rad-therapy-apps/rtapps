# Phase 1a — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A running monorepo — FastAPI API with a database-backed health check and migrations, a SvelteKit web app that calls the API server-side, all behind one Caddy origin in Docker Compose, with CI that lints, type-checks, tests and builds both apps on every pull request.

**Architecture:** Two applications (`apps/api` Python/FastAPI, `apps/web` SvelteKit) and PostgreSQL, composed behind a Caddy reverse proxy so the browser sees one origin (`/api/*` → API, everything else → web). No auth, no content model yet — those are plans 1b and 1c. This plan lays every rail they run on: settings, DB session, Alembic, test fixtures, Dockerfiles, compose, CI.

**Tech Stack:** Python 3.12 · uv · FastAPI ≥ 0.141 · SQLAlchemy ≥ 2.0.52 (async, asyncpg) · Alembic ≥ 1.19 · pydantic-settings ≥ 2.15 · pytest ≥ 9 · ruff · mypy · Node 24 · pnpm 11 (corepack) · SvelteKit 2 / Svelte 5 via `sv create` · adapter-node · vitest · Playwright · PostgreSQL 16 · MinIO · Caddy 2 · Docker Compose v5 · GitHub Actions.

## Global Constraints

- Repository: `/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps`, branch `main`, remote `rad-therapy-apps/rtapps` (private). Work on branch `feat/foundation`; open a PR at the end.
- Layout is fixed by `docs/03-architecture.md` §9: `apps/api`, `apps/web`, `packages/*`, `tools/*`, `infra/*`, `.github/workflows/*`.
- Python 3.12; all Python commands via `uv run …` inside `apps/api`; never `pip` or bare `python`.
- JS via `corepack pnpm` (write `pnpm` below — run `corepack enable` once so `pnpm` resolves).
- API base path `/api/v1`; health endpoint `GET /api/v1/health` returns `{"status":"ok","database":"ok"}`.
- Proxy origin in dev: `http://localhost:8080`.
- Conventional Commits (`docs/04-conventions.md` §2). Commit after every task.
- No secrets in the repo; `infra/.env.example` documents every variable; `.env` is git-ignored (already).
- No `{@html}` in `apps/web` (enforced by ESLint rule added in Task 4).

---

## File structure

| Path | Responsibility |
|---|---|
| `package.json`, `pnpm-workspace.yaml`, `.npmrc`, `.nvmrc` | Workspace root: pins Node, declares `apps/*` and `packages/*` workspaces, root scripts |
| `Makefile` | The developer command surface from `docs/04-conventions.md` §9 |
| `apps/api/pyproject.toml`, `uv.lock` | API dependencies, ruff/mypy/pytest config |
| `apps/api/app/main.py` | FastAPI app factory + lifespan; mounts routers |
| `apps/api/app/config.py` | `Settings` (pydantic-settings) read from env |
| `apps/api/app/db.py` | Async engine, session factory, `get_session` dependency, `Base` |
| `apps/api/app/health.py` | `/api/v1/health` router |
| `apps/api/alembic.ini`, `apps/api/alembic/env.py`, `apps/api/alembic/versions/0001_baseline.py` | Migrations (async env) |
| `apps/api/tests/conftest.py`, `tests/test_health.py`, `tests/test_migrations.py` | Test client + DB fixtures |
| `apps/api/Dockerfile` | uv-based image, non-root, `uvicorn` |
| `apps/web/` (scaffolded) + `src/hooks.server.ts`, `src/lib/server/api.ts`, `src/routes/+page.server.ts`, `src/routes/+page.svelte`, `src/routes/health/+server.ts` | Web app skeleton; server-side API client; status page |
| `apps/web/Dockerfile` | Node build → adapter-node runtime image |
| `infra/compose.yaml`, `infra/Caddyfile`, `infra/.env.example` | Dev stack |
| `.github/workflows/pr.yml` | PR pipeline |
| `docs/05-setup.md` | How to run it |

---

### Task 1: Workspace root, Makefile, env template

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `.npmrc`, `.nvmrc`, `Makefile`, `infra/.env.example`
- Modify: `.gitignore` (append)

**Interfaces:**
- Produces: `make dev|seed|test|lint|e2e|client|migrate` targets used by every later task and by `docs/05-setup.md`; env variable names consumed by `apps/api/app/config.py` (Task 2) and `infra/compose.yaml` (Task 5): `DATABASE_URL`, `SESSION_SECRET`, `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `API_INTERNAL_URL`, `PUBLIC_ORIGIN`.

- [ ] **Step 1: Create branch**

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps
git switch -c feat/foundation
corepack enable
```

- [ ] **Step 2: Write root workspace files**

`package.json`:
```json
{
  "name": "rtapps",
  "private": true,
  "packageManager": "pnpm@11.24.0",
  "engines": { "node": ">=24" },
  "scripts": {
    "lint": "pnpm -r --if-present lint",
    "check": "pnpm -r --if-present check",
    "test": "pnpm -r --if-present test",
    "build": "pnpm -r --if-present build"
  }
}
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - apps/*
  - packages/*
```

`.npmrc`:
```
auto-install-peers=true
strict-peer-dependencies=false
```

`.nvmrc`:
```
24
```

- [ ] **Step 3: Write the Makefile** (tabs, not spaces, for recipe lines)

```makefile
COMPOSE := docker compose -f infra/compose.yaml --env-file .env

.PHONY: dev down logs seed test test-api test-web lint lint-api lint-web e2e client migrate

dev: .env
	$(COMPOSE) up --build

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f --tail=100

.env:
	cp infra/.env.example .env
	@echo "Created .env from infra/.env.example — edit SESSION_SECRET before deploying anywhere."

test: test-api test-web

test-api:
	cd apps/api && uv run pytest

test-web:
	pnpm --filter web test

lint: lint-api lint-web

lint-api:
	cd apps/api && uv run ruff check . && uv run ruff format --check . && uv run mypy app

lint-web:
	pnpm --filter web lint && pnpm --filter web check

e2e:
	pnpm --filter web e2e

client:
	pnpm --filter web client

migrate:
	cd apps/api && uv run alembic revision --autogenerate -m "$(m)"
```

- [ ] **Step 4: Write `infra/.env.example`**

```dotenv
# ---- shared -------------------------------------------------------------
PUBLIC_ORIGIN=http://localhost:8080          # what the browser sees (proxy)
ENV=dev                                      # dev | test | prod

# ---- api ----------------------------------------------------------------
DATABASE_URL=postgresql+asyncpg://rtapps:rtapps@db:5432/rtapps
SESSION_SECRET=change-me-32-bytes-minimum-please-really
S3_ENDPOINT=http://storage:9000
S3_ACCESS_KEY=rtapps
S3_SECRET_KEY=rtapps-secret
S3_BUCKET=rtapps-media
LOG_LEVEL=info

# ---- web ----------------------------------------------------------------
API_INTERNAL_URL=http://api:8000             # server-side calls from SvelteKit
ORIGIN=http://localhost:8080                 # adapter-node CSRF origin

# ---- postgres container -------------------------------------------------
POSTGRES_USER=rtapps
POSTGRES_PASSWORD=rtapps
POSTGRES_DB=rtapps

# ---- minio container ----------------------------------------------------
MINIO_ROOT_USER=rtapps
MINIO_ROOT_PASSWORD=rtapps-secret
```

- [ ] **Step 5: Append to `.gitignore`**

```
# playwright / coverage
apps/web/test-results/
apps/web/playwright-report/
coverage/
.coverage
```

- [ ] **Step 6: Verify and commit**

Run: `make -n dev` — Expected: prints `cp infra/.env.example .env` then the compose command (no errors about missing separator; if you see "missing separator" the recipe lines are not tab-indented).

```bash
git add package.json pnpm-workspace.yaml .npmrc .nvmrc Makefile infra/.env.example .gitignore
git commit -m "chore: workspace root, Makefile and env template"
```

---

### Task 2: API skeleton with health endpoint (no DB yet)

**Files:**
- Create: `apps/api/pyproject.toml`, `apps/api/app/__init__.py`, `apps/api/app/config.py`, `apps/api/app/main.py`, `apps/api/app/health.py`, `apps/api/tests/__init__.py`, `apps/api/tests/conftest.py`, `apps/api/tests/test_health.py`, `apps/api/Dockerfile`, `apps/api/.dockerignore`

**Interfaces:**
- Produces: `app.main.create_app() -> FastAPI`; `app.config.Settings` with fields `database_url: str`, `session_secret: str`, `s3_endpoint: str`, `s3_access_key: str`, `s3_secret_key: str`, `s3_bucket: str`, `public_origin: str`, `env: str`, `log_level: str`; `app.config.get_settings()` (cached); `app.health.router`.
- Consumed by Task 3 (adds DB check to health), Task 5 (Dockerfile in compose), Task 6 (CI runs `uv run pytest`).

- [ ] **Step 1: Write `apps/api/pyproject.toml`**

```toml
[project]
name = "rtapps-api"
version = "0.1.0"
description = "RTApps API"
requires-python = ">=3.12,<3.13"
dependencies = [
  "fastapi>=0.141",
  "uvicorn[standard]>=0.52",
  "pydantic>=2.13",
  "pydantic-settings>=2.15",
  "sqlalchemy[asyncio]>=2.0.52",
  "asyncpg>=0.31",
  "alembic>=1.19",
]

[dependency-groups]
dev = [
  "pytest>=9",
  "pytest-asyncio>=1.4",
  "httpx>=0.28",
  "ruff>=0.16",
  "mypy>=2.3",
  "asgi-lifespan>=2.1",
]

[tool.uv]
package = false

[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "ASYNC", "SIM", "RUF"]

[tool.mypy]
python_version = "3.12"
strict = true
plugins = ["pydantic.mypy"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

- [ ] **Step 2: Write the failing health test**

`apps/api/tests/__init__.py`: empty file.

`apps/api/tests/conftest.py`:
```python
from collections.abc import AsyncIterator

import pytest
from asgi_lifespan import LifespanManager
from httpx import ASGITransport, AsyncClient

from app.main import create_app


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    app = create_app()
    async with LifespanManager(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            yield c
```

`apps/api/tests/test_health.py`:
```python
from httpx import AsyncClient


async def test_health_returns_ok(client: AsyncClient) -> None:
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
```

- [ ] **Step 3: Run the test to see it fail**

```bash
cd apps/api && uv sync && uv run pytest -q
```
Expected: `ImportError`/`ModuleNotFoundError: No module named 'app.main'`.

- [ ] **Step 4: Write config, health router, app factory**

`apps/api/app/__init__.py`: empty file.

`apps/api/app/config.py`:
```python
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    env: str = "dev"
    log_level: str = "info"
    public_origin: str = "http://localhost:8080"
    database_url: str = "postgresql+asyncpg://rtapps:rtapps@localhost:5432/rtapps"
    session_secret: str = "dev-only-secret-change-me"
    s3_endpoint: str = "http://localhost:9000"
    s3_access_key: str = "rtapps"
    s3_secret_key: str = "rtapps-secret"
    s3_bucket: str = "rtapps-media"


@lru_cache
def get_settings() -> Settings:
    return Settings()
```

`apps/api/app/health.py`:
```python
from fastapi import APIRouter

router = APIRouter(tags=["system"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
```

`apps/api/app/main.py`:
```python
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app import health
from app.config import get_settings

API_PREFIX = "/api/v1"


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.settings = get_settings()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="RTApps API",
        version="0.1.0",
        lifespan=lifespan,
        openapi_url=f"{API_PREFIX}/openapi.json",
        docs_url=f"{API_PREFIX}/docs",
    )
    app.include_router(health.router, prefix=API_PREFIX)
    return app


app = create_app()
```

- [ ] **Step 5: Run the test to see it pass; run lint**

```bash
uv run pytest -q
uv run ruff check . && uv run ruff format . && uv run mypy app
```
Expected: `1 passed`; ruff clean; `Success: no issues found`.

- [ ] **Step 6: Dockerfile and .dockerignore**

`apps/api/Dockerfile`:
```dockerfile
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS base
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

FROM base AS deps
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-dev

FROM base AS runtime
RUN useradd --create-home --uid 10001 app
COPY --from=deps /app/.venv /app/.venv
COPY app ./app
COPY alembic.ini ./
COPY alembic ./alembic
ENV PATH="/app/.venv/bin:$PATH"
USER app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```
(`alembic.ini`/`alembic/` are created in Task 3; the Docker build is first exercised in Task 5, after they exist.)

`apps/api/.dockerignore`:
```
.venv
__pycache__
*.pyc
.pytest_cache
.mypy_cache
.ruff_cache
tests
```

- [ ] **Step 7: Commit**

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps
git add apps/api
git commit -m "feat(api): FastAPI skeleton with settings and health endpoint"
```

---

### Task 3: Database session, Alembic, DB-backed health

**Files:**
- Create: `apps/api/app/db.py`, `apps/api/alembic.ini`, `apps/api/alembic/env.py`, `apps/api/alembic/script.py.mako`, `apps/api/alembic/versions/0001_baseline.py`, `apps/api/tests/test_migrations.py`
- Modify: `apps/api/app/health.py`, `apps/api/app/main.py`, `apps/api/tests/conftest.py`, `apps/api/tests/test_health.py`

**Interfaces:**
- Produces: `app.db.Base` (DeclarativeBase — every model in 1b/1c subclasses it), `app.db.get_engine(settings) -> AsyncEngine`, `app.db.get_session()` FastAPI dependency yielding `AsyncSession`; Alembic configured to import `app.db.Base.metadata` for autogenerate; test fixtures `engine`, `session` and an env var `TEST_DATABASE_URL`.
- Requires a reachable PostgreSQL for the DB tests. Locally: `docker run -d --name rtapps-test-pg -e POSTGRES_USER=rtapps -e POSTGRES_PASSWORD=rtapps -e POSTGRES_DB=rtapps_test -p 5433:5432 postgres:16` then `export TEST_DATABASE_URL=postgresql+asyncpg://rtapps:rtapps@localhost:5433/rtapps_test`. CI provides the same via a service container (Task 6).

- [ ] **Step 1: Write the failing tests**

Replace `apps/api/tests/test_health.py`:
```python
from httpx import AsyncClient


async def test_health_reports_database_ok(client: AsyncClient) -> None:
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}
```

`apps/api/tests/test_migrations.py`:
```python
import os

from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine


async def test_migrations_upgrade_head_and_create_alembic_version() -> None:
    url = os.environ["TEST_DATABASE_URL"]
    cfg = Config("alembic.ini")
    cfg.set_main_option("sqlalchemy.url", url)
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")
    engine = create_async_engine(url)
    async with engine.connect() as conn:
        version = await conn.scalar(text("SELECT version_num FROM alembic_version"))
    await engine.dispose()
    assert version == "0001"
```

Replace `apps/api/tests/conftest.py`:
```python
import os
from collections.abc import AsyncIterator

import pytest
from asgi_lifespan import LifespanManager
from httpx import ASGITransport, AsyncClient

from app.config import Settings, get_settings
from app.main import create_app

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+asyncpg://rtapps:rtapps@localhost:5433/rtapps_test"
)


@pytest.fixture
def settings() -> Settings:
    return Settings(database_url=TEST_DATABASE_URL, env="test")


@pytest.fixture
async def client(settings: Settings) -> AsyncIterator[AsyncClient]:
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: settings
    async with LifespanManager(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            yield c
```

- [ ] **Step 2: Run tests to see them fail**

```bash
cd apps/api && uv run pytest -q
```
Expected: `test_health_reports_database_ok` fails (`{"status":"ok"} != …`); `test_migrations…` fails with `FileNotFoundError`/alembic config missing.

- [ ] **Step 3: Write `app/db.py`**

```python
from collections.abc import AsyncIterator

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import Settings


class Base(DeclarativeBase):
    pass


def get_engine(settings: Settings) -> AsyncEngine:
    return create_async_engine(settings.database_url, pool_pre_ping=True)


def make_session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(engine, expire_on_commit=False)


def _factory_from_request(request: Request) -> async_sessionmaker[AsyncSession]:
    factory: async_sessionmaker[AsyncSession] = request.app.state.session_factory
    return factory


async def get_session(
    factory: async_sessionmaker[AsyncSession] = Depends(_factory_from_request),
) -> AsyncIterator[AsyncSession]:
    async with factory() as session:
        yield session
```

- [ ] **Step 4: Wire engine into lifespan; DB check in health**

Replace `apps/api/app/main.py`:
```python
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app import health
from app.config import get_settings
from app.db import get_engine, make_session_factory

API_PREFIX = "/api/v1"


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings_provider = app.dependency_overrides.get(get_settings, get_settings)
    settings = settings_provider()
    engine = get_engine(settings)
    app.state.settings = settings
    app.state.engine = engine
    app.state.session_factory = make_session_factory(engine)
    try:
        yield
    finally:
        await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title="RTApps API",
        version="0.1.0",
        lifespan=lifespan,
        openapi_url=f"{API_PREFIX}/openapi.json",
        docs_url=f"{API_PREFIX}/docs",
    )
    app.include_router(health.router, prefix=API_PREFIX)
    return app


app = create_app()
```

Replace `apps/api/app/health.py`:
```python
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session

router = APIRouter(tags=["system"])


@router.get("/health")
async def health(session: AsyncSession = Depends(get_session)) -> dict[str, str]:
    await session.execute(text("SELECT 1"))
    return {"status": "ok", "database": "ok"}
```

- [ ] **Step 5: Alembic (async) configuration**

`apps/api/alembic.ini`:
```ini
[alembic]
script_location = alembic
prepend_sys_path = .
file_template = %%(rev)s_%%(slug)s
sqlalchemy.url = postgresql+asyncpg://rtapps:rtapps@localhost:5432/rtapps

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
```

`apps/api/alembic/env.py`:
```python
import asyncio
import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.db import Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# DATABASE_URL from the environment wins over alembic.ini (compose / CI / prod).
if os.environ.get("DATABASE_URL"):
    config.set_main_option("sqlalchemy.url", os.environ["DATABASE_URL"])

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

`apps/api/alembic/script.py.mako`:
```mako
"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
${imports if imports else ""}

revision: str = ${repr(up_revision)}
down_revision: str | None = ${repr(down_revision)}
branch_labels: str | Sequence[str] | None = ${repr(branch_labels)}
depends_on: str | Sequence[str] | None = ${repr(depends_on)}


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
```

`apps/api/alembic/versions/0001_baseline.py`:
```python
"""baseline

Revision ID: 0001
Revises:
Create Date: 2026-08-27
"""
from collections.abc import Sequence

from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS citext")


def downgrade() -> None:
    op.execute("DROP EXTENSION IF EXISTS citext")
```
(`citext` is needed by the `user.email` column in plan 1b; creating the extension in the baseline keeps 1b's migration pure DDL.)

- [ ] **Step 6: Start a test Postgres, run the tests**

```bash
docker run -d --name rtapps-test-pg -e POSTGRES_USER=rtapps -e POSTGRES_PASSWORD=rtapps -e POSTGRES_DB=rtapps_test -p 5433:5432 postgres:16
export TEST_DATABASE_URL=postgresql+asyncpg://rtapps:rtapps@localhost:5433/rtapps_test
sleep 3
uv run pytest -q
uv run ruff check . && uv run ruff format . && uv run mypy app
```
Expected: `2 passed`; lint clean. (Note: `test_health` needs the `alembic_version` table? No — it only runs `SELECT 1`; order of tests does not matter.)

- [ ] **Step 7: Commit**

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps
git add apps/api
git commit -m "feat(api): async database session, Alembic baseline, DB-backed health"
```

---

### Task 4: SvelteKit web skeleton that calls the API server-side

**Files:**
- Create (scaffolded): `apps/web/*` via `sv create`
- Create: `apps/web/src/lib/server/api.ts`, `apps/web/src/hooks.server.ts`, `apps/web/src/routes/+page.server.ts`, `apps/web/src/routes/health/+server.ts`, `apps/web/src/lib/server/api.test.ts`, `apps/web/Dockerfile`, `apps/web/.dockerignore`
- Modify: `apps/web/src/routes/+page.svelte`, `apps/web/package.json` (scripts), `apps/web/eslint.config.js` (add no-`{@html}` rule), `apps/web/svelte.config.js` (adapter-node)

**Interfaces:**
- Produces: `apiFetch(fetch, path, init?)` in `src/lib/server/api.ts` — `(fetch: typeof globalThis.fetch, path: string, init?: RequestInit & { cookie?: string }) => Promise<Response>` that prefixes `API_INTERNAL_URL` and forwards a cookie header; `GET /health` on the web app returning `{web:"ok", api:<api health json>}`; `event.locals.apiBase`.
- Consumed by plan 1b (`hooks.server.ts` resolves the session there) and 1c (lesson `load` functions).

- [ ] **Step 1: Scaffold with the official CLI**

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps
pnpm dlx sv@latest create web --template minimal --types ts --no-install --no-add-ons
cd web
pnpm dlx sv@latest add eslint prettier vitest playwright --no-install
pnpm add -D @sveltejs/adapter-node
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps && pnpm install
```
If `sv` prompts interactively, answer: TypeScript = yes, add-ons = eslint, prettier, vitest, playwright. Note the versions `sv` chose in the commit message.

- [ ] **Step 2: adapter-node and scripts**

`apps/web/svelte.config.js`:
```js
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: { adapter: adapter() }
};

export default config;
```

In `apps/web/package.json` ensure these scripts exist (keep the ones `sv` generated; add/rename to match):
```json
{
  "scripts": {
    "dev": "vite dev --host 0.0.0.0 --port 5173",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "lint": "prettier --check . && eslint .",
    "format": "prettier --write .",
    "test": "vitest run",
    "e2e": "playwright test",
    "client": "openapi-typescript http://localhost:8080/api/v1/openapi.json -o ../../packages/api-client/src/schema.d.ts"
  }
}
```
(`client` targets a package created in plan 1c; it is declared now so the Makefile contract is complete.)

- [ ] **Step 3: Failing unit test for the API helper**

`apps/web/src/lib/server/api.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest';
import { apiFetch } from './api';

describe('apiFetch', () => {
	it('prefixes the internal API base and forwards the cookie header', async () => {
		const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
		await apiFetch(fetchMock as unknown as typeof fetch, '/health', { cookie: 'rt_session=abc' });
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('http://api:8000/api/v1/health');
		expect(new Headers(init.headers).get('cookie')).toBe('rt_session=abc');
	});
});
```

Run: `pnpm --filter web test` — Expected: fails, `Cannot find module './api'`.

- [ ] **Step 4: Implement the helper, hooks, health route, page**

`apps/web/src/lib/server/api.ts`:
```ts
import { env } from '$env/dynamic/private';

const API_BASE = `${env.API_INTERNAL_URL ?? 'http://api:8000'}/api/v1`;

export type ApiInit = RequestInit & { cookie?: string };

/** Server-side call to the API. Forwards the browser's cookie so the API sees the session. */
export async function apiFetch(fetch: typeof globalThis.fetch, path: string, init: ApiInit = {}) {
	const { cookie, headers, ...rest } = init;
	const h = new Headers(headers);
	if (cookie) h.set('cookie', cookie);
	if (!h.has('accept')) h.set('accept', 'application/json');
	return fetch(`${API_BASE}${path}`, { ...rest, headers: h });
}
```

`apps/web/src/hooks.server.ts`:
```ts
import type { Handle } from '@sveltejs/kit';

// Plan 1b replaces this with session resolution (GET /auth/me) and role guards.
export const handle: Handle = async ({ event, resolve }) => {
	event.locals.requestId = crypto.randomUUID();
	return resolve(event);
};
```

Add to `apps/web/src/app.d.ts` inside `namespace App`:
```ts
interface Locals {
	requestId: string;
}
```

`apps/web/src/routes/health/+server.ts`:
```ts
import { json } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';

export async function GET({ fetch, request }) {
	const res = await apiFetch(fetch, '/health', { cookie: request.headers.get('cookie') ?? undefined });
	const api = res.ok ? await res.json() : { status: 'error', code: res.status };
	return json({ web: 'ok', api });
}
```

`apps/web/src/routes/+page.server.ts`:
```ts
import { apiFetch } from '$lib/server/api';

export async function load({ fetch }) {
	let api: { status: string; database?: string } = { status: 'unreachable' };
	try {
		const res = await apiFetch(fetch, '/health');
		if (res.ok) api = await res.json();
	} catch {
		/* API down: show the status on the page instead of failing the render */
	}
	return { api };
}
```

`apps/web/src/routes/+page.svelte`:
```svelte
<script lang="ts">
	let { data } = $props();
</script>

<main>
	<h1>RTApps</h1>
	<p>Web: ok</p>
	<p>API: {data.api.status}{data.api.database ? ` (database ${data.api.database})` : ''}</p>
</main>
```

- [ ] **Step 5: Ban `{@html}` via ESLint**

In `apps/web/eslint.config.js`, add to the Svelte config block's `rules`:
```js
'svelte/no-at-html-tags': 'error'
```
(The `eslint-plugin-svelte` scaffolded by `sv` provides this rule.)

- [ ] **Step 6: Run unit test, lint, check**

```bash
pnpm --filter web test
pnpm --filter web lint
pnpm --filter web check
```
Expected: `1 passed`; prettier/eslint clean (run `pnpm --filter web format` first if prettier complains); svelte-check `0 errors`.

- [ ] **Step 7: Dockerfile**

`apps/web/Dockerfile`:
```dockerfile
FROM node:24-bookworm-slim AS build
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-workspace.yaml .npmrc ./
COPY apps/web/package.json apps/web/
COPY pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --filter web...
COPY apps/web apps/web
RUN pnpm --filter web build && pnpm --filter web --prod deploy /out

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3000
RUN useradd --create-home --uid 10001 app
WORKDIR /app
COPY --from=build /out /app
USER app
EXPOSE 3000
CMD ["node", "build"]
```
Build context is the **repo root** (see compose in Task 5).

`apps/web/.dockerignore`:
```
node_modules
.svelte-kit
build
test-results
playwright-report
```

- [ ] **Step 8: Commit**

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps
git add apps/web package.json pnpm-lock.yaml
git commit -m "feat(web): SvelteKit skeleton with server-side API client and status page"
```

---

### Task 5: Docker Compose dev stack behind Caddy

**Files:**
- Create: `infra/compose.yaml`, `infra/Caddyfile`, `apps/api/entrypoint.dev.sh`

**Interfaces:**
- Produces: `make dev` → `http://localhost:8080/` (web), `http://localhost:8080/api/v1/health` (API), `http://localhost:9001` (MinIO console), `http://localhost:8025` (Mailpit). Service names `db`, `storage`, `api`, `web`, `proxy`, `mailpit` are referenced by `.env.example` (Task 1) and CI (Task 6).

- [ ] **Step 1: Dev entrypoint for the API (migrate, then reload server)**

`apps/api/entrypoint.dev.sh`:
```bash
#!/usr/bin/env sh
set -e
uv run alembic upgrade head
exec uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
`chmod +x apps/api/entrypoint.dev.sh`

- [ ] **Step 2: Caddyfile**

`infra/Caddyfile`:
```
{
	auto_https off
}

:8080 {
	encode zstd gzip

	header {
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
		X-Frame-Options DENY
	}

	handle_path /api/* {
		reverse_proxy api:8000 {
			# restore the prefix the API expects
			header_up X-Forwarded-Prefix /api
		}
	}

	handle {
		reverse_proxy web:5173
	}
}
```
Note: `handle_path` strips `/api`, but the API routes are mounted at `/api/v1/...`. Use `handle` (no strip) instead:
```
	handle /api/* {
		reverse_proxy api:8000
	}
```
Use the `handle` form; delete the `handle_path` block. Final file:
```
{
	auto_https off
}

:8080 {
	encode zstd gzip
	header {
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
		X-Frame-Options DENY
	}
	handle /api/* {
		reverse_proxy api:8000
	}
	handle {
		reverse_proxy web:5173
	}
}
```

- [ ] **Step 3: compose.yaml**

`infra/compose.yaml`:
```yaml
name: rtapps

services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 3s
      retries: 10

  storage:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - minio-data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 5s
      timeout: 3s
      retries: 10

  storage-init:
    image: minio/mc:latest
    depends_on:
      storage:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      mc alias set local http://storage:9000 ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD} &&
      mc mb --ignore-existing local/${S3_BUCKET}
      "

  api:
    build:
      context: ../apps/api
      target: base
    command: ["sh", "/app/entrypoint.dev.sh"]
    working_dir: /app
    environment:
      DATABASE_URL: ${DATABASE_URL}
      SESSION_SECRET: ${SESSION_SECRET}
      S3_ENDPOINT: ${S3_ENDPOINT}
      S3_ACCESS_KEY: ${S3_ACCESS_KEY}
      S3_SECRET_KEY: ${S3_SECRET_KEY}
      S3_BUCKET: ${S3_BUCKET}
      PUBLIC_ORIGIN: ${PUBLIC_ORIGIN}
      ENV: ${ENV}
      UV_PROJECT_ENVIRONMENT: /opt/venv
    volumes:
      - ../apps/api:/app
      - api-venv:/opt/venv
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "python -c \"import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/api/v1/health').status==200 else 1)\""]
      interval: 10s
      timeout: 5s
      retries: 12
      start_period: 30s

  web:
    image: node:24-bookworm-slim
    working_dir: /repo
    command: ["sh", "-c", "corepack enable && pnpm install --frozen-lockfile && pnpm --filter web dev"]
    environment:
      API_INTERNAL_URL: ${API_INTERNAL_URL}
      ORIGIN: ${ORIGIN}
    volumes:
      - ..:/repo
      - web-node-modules:/repo/node_modules
      - web-app-node-modules:/repo/apps/web/node_modules
    depends_on:
      api:
        condition: service_healthy
    ports:
      - "5173:5173"

  proxy:
    image: caddy:2
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
    ports:
      - "8080:8080"
    depends_on:
      - web
      - api

  mailpit:
    image: axllent/mailpit:latest
    ports:
      - "8025:8025"
      - "1025:1025"

volumes:
  pgdata:
  minio-data:
  api-venv:
  web-node-modules:
  web-app-node-modules:
```

- [ ] **Step 4: Bring it up and verify**

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps
make dev            # first run: creates .env, builds api image, installs web deps — several minutes
```
In a second terminal:
```bash
curl -s http://localhost:8080/api/v1/health      # {"status":"ok","database":"ok"}
curl -s http://localhost:8080/health             # {"web":"ok","api":{"status":"ok","database":"ok"}}
curl -s http://localhost:8080/ | grep -o 'API: ok'
docker compose -f infra/compose.yaml --env-file .env ps   # all services running, api healthy
```
Expected: the three curls return as shown. If `web` fails with a lockfile error, run `pnpm install` on the host once and retry.

- [ ] **Step 5: Verify the production image builds**

```bash
docker build -t rtapps-api:dev apps/api
docker build -t rtapps-web:dev -f apps/web/Dockerfile .
```
Expected: both succeed. (Not run by compose in dev; CI builds them in Task 6.)

- [ ] **Step 6: Commit**

```bash
make down
git add infra apps/api/entrypoint.dev.sh
git commit -m "infra: Docker Compose dev stack with Postgres, MinIO, API, web, Caddy and Mailpit"
```

---

### Task 6: CI on every pull request

**Files:**
- Create: `.github/workflows/pr.yml`, `.github/dependabot.yml`

**Interfaces:**
- Produces: required check `pr` (jobs `api`, `web`, `images`) for branch protection on `main`.

- [ ] **Step 1: Workflow**

`.github/workflows/pr.yml`:
```yaml
name: pr

on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: pr-${{ github.ref }}
  cancel-in-progress: true

jobs:
  api:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/api
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: rtapps
          POSTGRES_PASSWORD: rtapps
          POSTGRES_DB: rtapps_test
        ports: ["5433:5432"]
        options: >-
          --health-cmd "pg_isready -U rtapps -d rtapps_test"
          --health-interval 5s --health-timeout 3s --health-retries 10
    env:
      TEST_DATABASE_URL: postgresql+asyncpg://rtapps:rtapps@localhost:5433/rtapps_test
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v6
        with:
          enable-cache: true
      - run: uv sync --frozen
      - run: uv run ruff check .
      - run: uv run ruff format --check .
      - run: uv run mypy app
      - run: uv run pytest -q

  web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: corepack enable
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter web lint
      - run: pnpm --filter web check
      - run: pnpm --filter web test

  images:
    runs-on: ubuntu-latest
    needs: [api, web]
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - name: Build api image
        uses: docker/build-push-action@v6
        with:
          context: apps/api
          push: false
          cache-from: type=gha
          cache-to: type=gha,mode=max
      - name: Build web image
        uses: docker/build-push-action@v6
        with:
          context: .
          file: apps/web/Dockerfile
          push: false
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

`.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: uv
    directory: /apps/api
    schedule: { interval: weekly }
  - package-ecosystem: npm
    directory: /
    schedule: { interval: weekly }
  - package-ecosystem: github-actions
    directory: /
    schedule: { interval: weekly }
  - package-ecosystem: docker
    directory: /apps/api
    schedule: { interval: weekly }
  - package-ecosystem: docker
    directory: /apps/web
    schedule: { interval: weekly }
```

- [ ] **Step 2: Commit, push, open the PR**

```bash
git add .github
git commit -m "ci: pull-request pipeline (api lint/type/test, web lint/check/test, image builds) and Dependabot"
git push -u origin feat/foundation
gh pr create --title "Foundation: monorepo scaffold, compose dev stack, CI" --body-file - <<'EOF'
## What
API (FastAPI) and web (SvelteKit) skeletons, async DB session + Alembic baseline, Docker Compose dev stack behind Caddy, PR pipeline.

## Why
Phase 1a of `docs/plans/2026-08-27-phase-1a-foundation.md` — the rails plans 1b (auth) and 1c (lessons) run on.

## How it was tested
- `make dev` → `/api/v1/health` and `/health` return ok through the proxy
- `uv run pytest` (health + migrations against Postgres), `pnpm --filter web test`
- both Docker images build locally; CI runs the same

## Docs
`docs/05-setup.md` added.
EOF
```

- [ ] **Step 3: Watch CI; fix until green**

```bash
gh pr checks --watch
```
Expected: `api`, `web`, `images` all pass. If `web` fails on prettier, run `pnpm --filter web format`, commit, push.

- [ ] **Step 4: Require the checks on `main`**

```bash
gh api -X PUT repos/rad-therapy-apps/rtapps/branches/main/protection \
  -f required_status_checks[strict]=true \
  -f 'required_status_checks[contexts][]=api' -f 'required_status_checks[contexts][]=web' -f 'required_status_checks[contexts][]=images' \
  -F enforce_admins=false \
  -f required_pull_request_reviews[required_approving_review_count]=0 \
  -F restrictions= \
  -F allow_force_pushes=false -F allow_deletions=false
```
Expected: JSON describing the protection rule. (If the API rejects the `restrictions=` form, run it without that flag; personal-org repos ignore restrictions.)

---

### Task 7: Setup documentation and merge

**Files:**
- Create: `docs/05-setup.md`
- Modify: `README.md` (point to setup doc)

- [ ] **Step 1: Write `docs/05-setup.md`**

```markdown
# Local setup

## Prerequisites
- Docker Desktop (Compose v2+), Node 24 (`corepack enable` once), Python 3.12 with `uv`.
- `gh` CLI logged in to the `rad-therapy-apps` org (for PRs).

## First run
```bash
git clone git@github.com:rad-therapy-apps/rtapps.git && cd rtapps
make dev                 # creates .env from infra/.env.example, builds and starts everything
```
Open http://localhost:8080 — the status page shows web and API health.
- API docs: http://localhost:8080/api/v1/docs
- MinIO console: http://localhost:9001 (user/password from `.env`)
- Mailpit (outgoing mail in dev): http://localhost:8025

## Day to day
| Command | Does |
|---|---|
| `make dev` / `make down` / `make logs` | start / stop / tail the stack |
| `make test` | API tests (needs `TEST_DATABASE_URL`, see below) + web unit tests |
| `make lint` | ruff, mypy, prettier, eslint, svelte-check |
| `make migrate m="add user table"` | new Alembic revision from model changes |
| `make e2e` | Playwright against the running stack |

### API tests outside compose
The API tests need a PostgreSQL. Either use the compose `db` (`TEST_DATABASE_URL=postgresql+asyncpg://rtapps:rtapps@localhost:5432/rtapps_test` after `createdb rtapps_test`), or a throwaway container:
```bash
docker run -d --name rtapps-test-pg -e POSTGRES_USER=rtapps -e POSTGRES_PASSWORD=rtapps -e POSTGRES_DB=rtapps_test -p 5433:5432 postgres:16
export TEST_DATABASE_URL=postgresql+asyncpg://rtapps:rtapps@localhost:5433/rtapps_test
cd apps/api && uv run pytest
```

## Layout
See `docs/03-architecture.md` §9. Short version: `apps/api` (FastAPI), `apps/web` (SvelteKit), `infra/` (compose, Caddy), `docs/`.

## Troubleshooting
- **`web` container loops on `pnpm install`** — run `pnpm install` once on the host so `pnpm-lock.yaml` matches, then `make dev` again.
- **`api` unhealthy** — `make logs`; usually the DB isn't ready yet on first boot; it retries for 30 s.
- **Port in use** — 8080 (proxy), 5173 (web), 8000 is internal, 5432 (db), 9000/9001 (MinIO), 8025 (Mailpit).
```

- [ ] **Step 2: Add a pointer in README.md**

Under the bullet list in `README.md` add:
```markdown

Getting started: `docs/05-setup.md`.
```

- [ ] **Step 3: Commit, push, merge**

```bash
git add docs/05-setup.md README.md
git commit -m "docs: local setup guide"
git push
gh pr checks --watch
gh pr merge --squash --delete-branch
git switch main && git pull
git tag -a v0.0.1 -m "Foundation: scaffold, compose, CI" && git push origin v0.0.1
```
Expected: PR merged, `main` at the squash commit, tag pushed.

---

## Self-review

- **Spec coverage** (`docs/03-architecture.md`): §3 services db/storage/api/web/proxy ✔ (Tasks 3–5; `backup` is prod-only → plan 2); §4.1 same-origin split ✔ (Caddyfile, `apiFetch` cookie forwarding); §9 layout ✔ (`packages/` and `tools/` dirs are created by plans 1c/2 when they have content); §10.1 dev compose ✔ (`make seed` arrives with plan 1c, which is the first plan with data to seed); §11 CI ✔ (Playwright e2e and the contract job join in plan 1c when there is a flow and a client to check); Dependabot ✔.
- **Placeholder scan**: none. The Caddyfile step shows a wrong-then-corrected form deliberately to explain `handle` vs `handle_path`; the final file is complete.
- **Type consistency**: `apiFetch(fetch, path, init)` signature matches between test and implementation; `get_session` dependency name is used consistently in `health.py`; `Settings` field names match `.env.example` (`DATABASE_URL` → `database_url`, etc., pydantic-settings is case-insensitive); revision id `"0001"` matches `test_migrations`.
- **Known deviation risk**: `sv create` flags and the scaffolded ESLint config shape may differ from the versions in this plan (the JS ecosystem moved past the author's reference). The implementer should keep whatever `sv` generates and only *add* the items listed (adapter-node, scripts, the `no-at-html-tags` rule, the four new source files).
