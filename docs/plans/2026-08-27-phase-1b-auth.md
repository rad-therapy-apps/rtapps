# Phase 1b — Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Students, educators and admins can register, sign in (email + password or Google), stay signed in with a server-side session, and sign out; the API enforces roles; the SvelteKit app knows who the user is on every request and guards its route groups.

**Architecture:** Sessions are opaque random tokens stored hashed in Postgres and carried in an `HttpOnly` cookie (`rt_session`) on the single Caddy origin, so the browser sends it automatically to `/api/v1/*` and SvelteKit forwards it server-side (ADR-0002). Passwords use argon2id. Google sign-in is a plain OIDC authorization-code flow implemented with `httpx` (no Authlib session coupling), linking accounts by verified email through an `identity` row. Authorization is a FastAPI dependency (`require_role`). The web app resolves `locals.user` once per request in `hooks.server.ts` and redirects unauthenticated users from the `(app)` route group.

**Tech Stack:** FastAPI · SQLAlchemy 2 async · Alembic · argon2-cffi · httpx (+ `respx` for tests) · itsdangerous (signed OAuth state) · uuid-utils (UUID v7) · SvelteKit form actions · vitest · pytest.

## Global Constraints

- Repo `/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps`, branch `feat/auth` from `main` (≥ `v0.0.1`); PR at the end; CI (`pr.yml`) must be green.
- Python via `uv run …` inside `apps/api`; JS via `pnpm`. Conventional Commits; commit after every task.
- API base path `/api/v1`. Cookie name `rt_session`; attributes `HttpOnly; Secure (when env != dev); SameSite=Lax; Path=/`; lifetime **14 days sliding** (refreshed when < 7 days remain). Session token: 32 random bytes (`secrets.token_urlsafe(32)`); only `sha256(token)` hex is stored.
- Passwords: argon2id via `argon2-cffi` default parameters; minimum length **10** (NFR from `docs/02-requirements.md`).
- Roles: `student | educator | admin` (Postgres enum `user_role`). New registrations are `student`. Admin/educator are set by an admin (endpoint in plan 2) or the seed.
- CSRF: every non-GET/HEAD/OPTIONS request to the API must carry an `Origin` header equal to `settings.public_origin` (or be absent when `env == "test"` for test clients that do not set it — see Task 5); otherwise `403 problem+json`.
- Errors are RFC 9457 `application/problem+json`: `{"type":"about:blank","title":…,"status":…,"detail":…}`.
- No secrets in the repo; `infra/.env.example` gains `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (empty by default → Google sign-in disabled and the button hidden).
- Settings hardening (issue #5): when `env` is not `dev`/`test`, `SESSION_SECRET` must not be the default and must be ≥ 32 characters, else the app refuses to start. API docs (`/api/v1/docs`, `openapi.json`) are disabled when `env == "prod"` (issue #7).
- Keep the test database on `TEST_DATABASE_URL` (default `…@localhost:5433/rtapps_test`; the developer machine uses 5434 via the env var).

---

## File structure

| Path | Responsibility |
|---|---|
| `apps/api/app/config.py` (modify) | add `google_client_id/secret`, `cookie_secure`, validators for secret + env |
| `apps/api/app/main.py` (modify) | `create_app(settings=None)`; docs gating; CSRF middleware; problem+json handlers; mount auth router |
| `apps/api/app/errors.py` (new) | `Problem` exception + handlers producing RFC 9457 |
| `apps/api/app/ids.py` (new) | `new_id()` → UUID v7 |
| `apps/api/app/auth/models.py` (new) | `User`, `Identity`, `Session` ORM models + `UserRole` enum |
| `apps/api/alembic/versions/0002_auth.py` (new) | tables + enum |
| `apps/api/app/auth/passwords.py` (new) | `hash_password`, `verify_password`, `validate_password_strength` |
| `apps/api/app/auth/sessions.py` (new) | token generation/hashing, `create_session`, `resolve_session` (sliding), `revoke_session`, `revoke_all_for_user` |
| `apps/api/app/auth/schemas.py` (new) | Pydantic request/response models |
| `apps/api/app/auth/deps.py` (new) | `current_user`, `require_user`, `require_role` |
| `apps/api/app/auth/router.py` (new) | `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/google/start`, `/auth/google/callback` |
| `apps/api/app/auth/google.py` (new) | OIDC helpers: build auth URL, exchange code, fetch userinfo; signed `state` cookie |
| `apps/api/app/csrf.py` (new) | Origin-check middleware |
| `apps/api/tests/conftest.py` (modify) | session-scoped migration, per-test transactional session, `client` bound to it, `register_user`/`login` helpers |
| `apps/api/tests/test_migrations.py` (modify) | uses the session fixture; asserts head revision |
| `apps/api/tests/test_settings.py`, `test_passwords.py`, `test_sessions.py`, `test_auth_routes.py`, `test_csrf.py`, `test_google.py`, `test_roles.py` (new) | |
| `apps/web/src/lib/server/api.ts` (modify) | `apiFetch(eventOrFetch, path, init)`; `relaySetCookie(event, res)` |
| `apps/web/src/hooks.server.ts` (modify) | `locals.user` via `/auth/me`; guard `(app)` group |
| `apps/web/src/lib/server/guard.ts` (new) + `guard.test.ts` | pure `decideAccess(pathname, user)` used by hooks |
| `apps/web/src/app.d.ts` (modify) | `Locals.user`, `App.User` type |
| `apps/web/src/routes/(auth)/login/+page.svelte`, `+page.server.ts`; `(auth)/register/…`; `(auth)/logout/+page.server.ts` (new) | forms + actions relaying cookies |
| `apps/web/src/routes/(app)/+layout.server.ts`, `(app)/+layout.svelte`, `(app)/home/+page.svelte` (new) | signed-in shell |
| `apps/web/src/routes/+page.server.ts` (modify) | redirect signed-in users to `/home` |
| `infra/.env.example`, `infra/compose.yaml` (modify) | Google vars; pass through to `api` |
| `docs/05-setup.md` (modify) | Google OAuth setup notes |

---

### Task 1: Settings hardening, `create_app(settings)`, problem+json errors, docs gating

**Files:**
- Modify: `apps/api/app/config.py`, `apps/api/app/main.py`, `apps/api/tests/conftest.py`
- Create: `apps/api/app/errors.py`, `apps/api/tests/test_settings.py`, `apps/api/tests/test_errors.py`

**Interfaces:**
- Produces: `create_app(settings: Settings | None = None) -> FastAPI` storing `app.state.settings`; `get_settings(request) -> Settings` FastAPI dependency reading `request.app.state.settings`; `Settings` fields added: `google_client_id: str = ""`, `google_client_secret: str = ""`, `cookie_secure: bool` (computed: `env != "dev"`), `session_days: int = 14`; `app.errors.Problem(status, title, detail=None)` exception and `install_error_handlers(app)`.
- Consumed by every later task (routes raise `Problem`; tests build `create_app(settings)`).

- [ ] **Step 1: Failing tests**

`apps/api/tests/test_settings.py`:
```python
import pytest
from pydantic import ValidationError

from app.config import Settings


def test_dev_allows_default_secret() -> None:
    s = Settings(env="dev")
    assert s.session_secret.startswith("dev-only")
    assert s.cookie_secure is False


def test_prod_rejects_default_or_short_secret() -> None:
    with pytest.raises(ValidationError):
        Settings(env="prod")
    with pytest.raises(ValidationError):
        Settings(env="prod", session_secret="short")
    s = Settings(env="prod", session_secret="x" * 32)
    assert s.cookie_secure is True


def test_unknown_env_rejected() -> None:
    with pytest.raises(ValidationError):
        Settings(env="staging")
```

`apps/api/tests/test_errors.py`:
```python
from httpx import AsyncClient


async def test_404_is_problem_json(client: AsyncClient) -> None:
    r = await client.get("/api/v1/does-not-exist")
    assert r.status_code == 404
    assert r.headers["content-type"].startswith("application/problem+json")
    assert r.json()["status"] == 404


async def test_docs_disabled_in_prod() -> None:
    from app.config import Settings
    from app.main import create_app

    app = create_app(Settings(env="prod", session_secret="x" * 32))
    assert app.openapi_url is None
```

Run: `cd apps/api && uv run pytest tests/test_settings.py tests/test_errors.py -q` → fails (`ValidationError` not raised; `create_app()` takes no argument).

- [ ] **Step 2: Implement `config.py`**

```python
from functools import lru_cache
from typing import Literal, Self

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_DEV_SECRET = "dev-only-secret-change-me"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    env: Literal["dev", "test", "prod"] = "dev"
    log_level: str = "info"
    public_origin: str = "http://localhost:8080"
    database_url: str = "postgresql+asyncpg://rtapps:rtapps@localhost:5432/rtapps"
    session_secret: str = DEFAULT_DEV_SECRET
    session_days: int = Field(default=14, ge=1, le=90)
    s3_endpoint: str = "http://localhost:9000"
    s3_access_key: str = "rtapps"
    s3_secret_key: str = "rtapps-secret"
    s3_bucket: str = "rtapps-media"
    google_client_id: str = ""
    google_client_secret: str = ""

    @property
    def cookie_secure(self) -> bool:
        return self.env != "dev"

    @property
    def google_enabled(self) -> bool:
        return bool(self.google_client_id and self.google_client_secret)

    @model_validator(mode="after")
    def _secret_is_safe_outside_dev(self) -> Self:
        if self.env in ("dev", "test"):
            return self
        if self.session_secret == DEFAULT_DEV_SECRET or len(self.session_secret) < 32:
            raise ValueError("SESSION_SECRET must be set to a random value of at least 32 characters")
        return self


@lru_cache
def load_settings() -> Settings:
    """Read settings from the environment once (process-wide)."""
    return Settings()
```

- [ ] **Step 3: Implement `errors.py`**

```python
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

PROBLEM = "application/problem+json"


class Problem(Exception):
    def __init__(self, status: int, title: str, detail: str | None = None) -> None:
        super().__init__(title)
        self.status = status
        self.title = title
        self.detail = detail


def problem_response(status: int, title: str, detail: str | None = None, **extra: object) -> JSONResponse:
    body: dict[str, object] = {"type": "about:blank", "title": title, "status": status}
    if detail:
        body["detail"] = detail
    body.update(extra)
    return JSONResponse(body, status_code=status, media_type=PROBLEM)


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(Problem)
    async def _problem(_: Request, exc: Problem) -> JSONResponse:
        return problem_response(exc.status, exc.title, exc.detail)

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        return problem_response(exc.status_code, str(exc.detail))

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        errors = [{"loc": list(e["loc"]), "msg": e["msg"]} for e in exc.errors()]
        return problem_response(422, "Validation failed", errors=errors)
```

- [ ] **Step 4: Rewrite `main.py`**

```python
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request

from app import health
from app.config import Settings, load_settings
from app.db import get_engine, make_session_factory
from app.errors import install_error_handlers

API_PREFIX = "/api/v1"


def get_settings(request: Request) -> Settings:
    settings: Settings = request.app.state.settings
    return settings


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings: Settings = app.state.settings
    engine = get_engine(settings)
    app.state.engine = engine
    app.state.session_factory = make_session_factory(engine)
    try:
        yield
    finally:
        await engine.dispose()


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or load_settings()
    docs_enabled = settings.env != "prod"
    app = FastAPI(
        title="RTApps API",
        version="0.2.0",
        lifespan=lifespan,
        openapi_url=f"{API_PREFIX}/openapi.json" if docs_enabled else None,
        docs_url=f"{API_PREFIX}/docs" if docs_enabled else None,
        redoc_url=None,
    )
    app.state.settings = settings
    install_error_handlers(app)
    app.include_router(health.router, prefix=API_PREFIX)
    return app


app = create_app()
```

- [ ] **Step 5: Update `conftest.py` to use `create_app(settings)`**

Replace the `client` fixture body: `app = create_app(settings)` and drop `dependency_overrides`. Keep `settings` fixture returning `Settings(database_url=TEST_DATABASE_URL, env="test")`.

- [ ] **Step 6: Run everything**

```bash
uv run pytest -q          # expect 6 passed
uv run ruff check . && uv run ruff format . && uv run mypy app
```

- [ ] **Step 7: Commit**

```bash
git add -A apps/api && git commit -m "feat(api): create_app(settings), settings hardening, problem+json errors, docs gated in prod"
```
Closes #5, #7, #20.

---

### Task 2: Test infrastructure — migrate once, roll back per test

**Files:**
- Modify: `apps/api/tests/conftest.py`, `apps/api/tests/test_migrations.py`
- Modify: `apps/api/app/db.py` (add `get_session` override hook via `app.state.session_factory` — unchanged API)

**Interfaces:**
- Produces: session-scoped fixture `migrated_db` (runs `alembic downgrade base` + `upgrade head` once per test session against `TEST_DATABASE_URL`); function-scoped `db: AsyncSession` bound to a connection with an outer transaction that is rolled back after each test; `client` whose app uses **the same connection** (so what a test seeds is visible to the request and everything vanishes afterwards).

- [ ] **Step 1: Write `conftest.py`**

```python
import asyncio
import os
from collections.abc import AsyncIterator, Iterator

import pytest
from alembic import command
from alembic.config import Config
from asgi_lifespan import LifespanManager
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.config import Settings
from app.main import create_app

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+asyncpg://rtapps:rtapps@localhost:5433/rtapps_test"
)


@pytest.fixture(scope="session")
def settings() -> Settings:
    return Settings(database_url=TEST_DATABASE_URL, env="test", public_origin="http://test")


@pytest.fixture(scope="session")
def migrated_db(monkeypatch_session: pytest.MonkeyPatch) -> Iterator[None]:
    monkeypatch_session.setenv("DATABASE_URL", TEST_DATABASE_URL)
    cfg = Config("alembic.ini")
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")
    yield


@pytest.fixture(scope="session")
def monkeypatch_session() -> Iterator[pytest.MonkeyPatch]:
    mp = pytest.MonkeyPatch()
    yield mp
    mp.undo()


@pytest.fixture(scope="session")
def event_loop_policy() -> asyncio.AbstractEventLoopPolicy:
    return asyncio.DefaultEventLoopPolicy()


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
        factory = async_sessionmaker(bind=conn, expire_on_commit=False, join_transaction_mode="create_savepoint")
        async with factory() as session:
            yield session
        await trans.rollback()


@pytest.fixture
async def client(settings: Settings, db: AsyncSession) -> AsyncIterator[AsyncClient]:
    app = create_app(settings)
    async with LifespanManager(app):
        # Route every request's session onto the test's connection/transaction.
        app.state.session_factory = async_sessionmaker(
            bind=db.bind, expire_on_commit=False, join_transaction_mode="create_savepoint"
        )
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            yield c
```

`apps/api/tests/test_migrations.py`:
```python
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def test_schema_is_at_head(db: AsyncSession) -> None:
    version = await db.scalar(text("SELECT version_num FROM alembic_version"))
    assert version == "0002"  # bump when a migration is added
```
(Until Task 3 lands, assert `"0001"`; Task 3 changes it to `"0002"`.)

- [ ] **Step 2: Run**

`uv run pytest -q` → all pass (health uses the shared connection; migrations ran once). Lint/mypy clean. Note: `join_transaction_mode="create_savepoint"` makes `session.commit()` inside request handlers commit only a SAVEPOINT, so the outer rollback still discards everything.

- [ ] **Step 3: Commit** — `test(api): migrate once per session, transactional per-test sessions` (closes #9).

---

### Task 3: Auth models and migration 0002

**Files:**
- Create: `apps/api/app/ids.py`, `apps/api/app/auth/__init__.py`, `apps/api/app/auth/models.py`, `apps/api/alembic/versions/0002_auth.py`
- Modify: `apps/api/pyproject.toml` (add `uuid-utils>=0.10`, `argon2-cffi>=25.1`, `itsdangerous>=2.2`; dev: `respx>=0.22`), `apps/api/alembic/env.py` (import models so autogenerate sees them), `apps/api/tests/test_migrations.py` (`"0002"`)

**Interfaces:**
- Produces: `new_id() -> uuid.UUID` (v7); `UserRole` (`str, enum.Enum`: `student/educator/admin`); `User(id, email, display_name, role, password_hash: str|None, deactivated_at, created_at, updated_at)`; `Identity(id, user_id, provider: str, subject: str, email_verified: bool)`; `Session(id: str  # sha256 hex, user_id, expires_at, ua_hash: str|None, revoked_at)`; relationships `User.identities`, `User.sessions`.

- [ ] **Step 1: `ids.py`**
```python
import uuid

import uuid_utils


def new_id() -> uuid.UUID:
    return uuid.UUID(bytes=uuid_utils.uuid7().bytes)
```

- [ ] **Step 2: `auth/models.py`**
```python
import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import CITEXT, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.ids import new_id


class UserRole(str, enum.Enum):
    student = "student"
    educator = "educator"
    admin = "admin"


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class User(TimestampMixin, Base):
    __tablename__ = "user"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(CITEXT, unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role"), nullable=False, default=UserRole.student)
    password_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    deactivated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    identities: Mapped[list["Identity"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    sessions: Mapped[list["Session"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Identity(TimestampMixin, Base):
    __tablename__ = "identity"
    __table_args__ = (UniqueConstraint("provider", "subject", name="uq_identity_provider_subject"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    user: Mapped[User] = relationship(back_populates="identities")


class Session(TimestampMixin, Base):
    __tablename__ = "session"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # sha256 hex of the token
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    ua_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship(back_populates="sessions")
```

- [ ] **Step 3: Migration `0002_auth.py`** (hand-written; autogenerate then verify it matches)
```python
"""auth: user, identity, session

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-27
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

user_role = postgresql.ENUM("student", "educator", "admin", name="user_role", create_type=False)


def upgrade() -> None:
    op.execute("CREATE TYPE user_role AS ENUM ('student', 'educator', 'admin')")
    op.create_table(
        "user",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", postgresql.CITEXT(), nullable=False),
        sa.Column("display_name", sa.String(120), nullable=False),
        sa.Column("role", user_role, nullable=False, server_default="student"),
        sa.Column("password_hash", sa.Text(), nullable=True),
        sa.Column("deactivated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("email", name="uq_user_email"),
    )
    op.create_table(
        "identity",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(32), nullable=False),
        sa.Column("subject", sa.String(255), nullable=False),
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("provider", "subject", name="uq_identity_provider_subject"),
    )
    op.create_index("ix_identity_user_id", "identity", ["user_id"])
    op.create_table(
        "session",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ua_hash", sa.String(64), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_session_user_id", "session", ["user_id"])
    op.create_index("ix_session_expires_at", "session", ["expires_at"])


def downgrade() -> None:
    op.drop_table("session")
    op.drop_table("identity")
    op.drop_table("user")
    op.execute("DROP TYPE user_role")
```
In `alembic/env.py` add `import app.auth.models  # noqa: F401` after `from app.db import Base` so `Base.metadata` includes the tables.

- [ ] **Step 4: Verify autogenerate sees no drift**
```bash
uv add uuid-utils argon2-cffi itsdangerous && uv add --dev respx
export DATABASE_URL=$TEST_DATABASE_URL
uv run alembic upgrade head
uv run alembic revision --autogenerate -m "drift-check" --rev-id tmp && cat alembic/versions/tmp_drift_check.py
```
The generated `upgrade()` must be `pass` (or only `server_default`/type cosmetic diffs — if it emits real DDL, fix the models/migration until it is empty). Then `rm alembic/versions/tmp_drift_check.py`. Update `test_migrations.py` to `"0002"`. `uv run pytest -q` → green; lint/mypy clean.

- [ ] **Step 5: Commit** — `feat(api): user, identity and session models with migration 0002`.

---

### Task 4: Passwords and session service

**Files:**
- Create: `apps/api/app/auth/passwords.py`, `apps/api/app/auth/sessions.py`, `apps/api/tests/test_passwords.py`, `apps/api/tests/test_sessions.py`

**Interfaces:**
- `hash_password(plain) -> str`; `verify_password(plain, hashed) -> bool`; `validate_password_strength(plain) -> None` raises `ValueError` if `< 10` chars.
- `generate_token() -> str`; `hash_token(token) -> str` (sha256 hex); `async create_session(db, user, ua: str|None, days: int) -> tuple[str, Session]` (returns the raw token once); `async resolve_session(db, token, now, days) -> User | None` (None if missing/expired/revoked/user deactivated; extends `expires_at` when < half the lifetime remains); `async revoke_session(db, token) -> None`; `async revoke_all_for_user(db, user_id) -> int`.

- [ ] **Step 1: Failing tests**

`tests/test_passwords.py`:
```python
import pytest

from app.auth.passwords import hash_password, validate_password_strength, verify_password


def test_hash_and_verify_roundtrip() -> None:
    h = hash_password("correct horse battery")
    assert h.startswith("$argon2id$")
    assert verify_password("correct horse battery", h)
    assert not verify_password("wrong", h)


def test_strength_minimum_length() -> None:
    with pytest.raises(ValueError):
        validate_password_strength("short1")
    validate_password_strength("long enough 1")
```

`tests/test_sessions.py`:
```python
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User, UserRole
from app.auth.sessions import create_session, hash_token, resolve_session, revoke_all_for_user, revoke_session


async def _user(db: AsyncSession) -> User:
    u = User(email="s@example.edu", display_name="Sam", role=UserRole.student)
    db.add(u)
    await db.flush()
    return u


async def test_create_and_resolve(db: AsyncSession) -> None:
    u = await _user(db)
    token, sess = await create_session(db, u, ua="ua", days=14)
    assert sess.id == hash_token(token)
    assert await resolve_session(db, token, now=datetime.now(UTC), days=14) is not None
    assert await resolve_session(db, "nope", now=datetime.now(UTC), days=14) is None


async def test_expired_and_revoked(db: AsyncSession) -> None:
    u = await _user(db)
    token, sess = await create_session(db, u, ua=None, days=14)
    later = datetime.now(UTC) + timedelta(days=15)
    assert await resolve_session(db, token, now=later, days=14) is None
    token2, _ = await create_session(db, u, ua=None, days=14)
    await revoke_session(db, token2)
    assert await resolve_session(db, token2, now=datetime.now(UTC), days=14) is None


async def test_sliding_expiry_extends_when_under_half(db: AsyncSession) -> None:
    u = await _user(db)
    token, sess = await create_session(db, u, ua=None, days=14)
    original = sess.expires_at
    at = original - timedelta(days=6)  # 6 days left < 7 → extend
    assert await resolve_session(db, token, now=at, days=14) is not None
    await db.refresh(sess)
    assert sess.expires_at > original


async def test_revoke_all(db: AsyncSession) -> None:
    u = await _user(db)
    t1, _ = await create_session(db, u, ua=None, days=14)
    t2, _ = await create_session(db, u, ua=None, days=14)
    assert await revoke_all_for_user(db, u.id) == 2
    assert await resolve_session(db, t1, now=datetime.now(UTC), days=14) is None
```

Run: `uv run pytest tests/test_passwords.py tests/test_sessions.py -q` → ImportError.

- [ ] **Step 2: Implement `passwords.py`**
```python
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

MIN_PASSWORD_LENGTH = 10
_hasher = PasswordHasher()


def validate_password_strength(plain: str) -> None:
    if len(plain) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters")


def hash_password(plain: str) -> str:
    return _hasher.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _hasher.verify(hashed, plain)
    except VerifyMismatchError:
        return False
```

- [ ] **Step 3: Implement `sessions.py`**
```python
import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Session, User


def generate_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def hash_user_agent(ua: str | None) -> str | None:
    return hashlib.sha256(ua.encode()).hexdigest() if ua else None


async def create_session(db: AsyncSession, user: User, ua: str | None, days: int) -> tuple[str, Session]:
    token = generate_token()
    sess = Session(
        id=hash_token(token),
        user_id=user.id,
        expires_at=datetime.now(UTC) + timedelta(days=days),
        ua_hash=hash_user_agent(ua),
    )
    db.add(sess)
    await db.flush()
    return token, sess


async def resolve_session(db: AsyncSession, token: str, now: datetime, days: int) -> User | None:
    sess = await db.get(Session, hash_token(token))
    if sess is None or sess.revoked_at is not None or sess.expires_at <= now:
        return None
    user = await db.get(User, sess.user_id)
    if user is None or user.deactivated_at is not None:
        return None
    if sess.expires_at - now < timedelta(days=days) / 2:
        sess.expires_at = now + timedelta(days=days)
        await db.flush()
    return user


async def revoke_session(db: AsyncSession, token: str) -> None:
    sess = await db.get(Session, hash_token(token))
    if sess is not None and sess.revoked_at is None:
        sess.revoked_at = datetime.now(UTC)
        await db.flush()


async def revoke_all_for_user(db: AsyncSession, user_id: uuid.UUID) -> int:
    result = await db.execute(
        update(Session)
        .where(Session.user_id == user_id, Session.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC))
    )
    await db.flush()
    return result.rowcount or 0


async def user_by_email(db: AsyncSession, email: str) -> User | None:
    return await db.scalar(select(User).where(User.email == email))
```

- [ ] **Step 4: Run, lint, commit** — `uv run pytest -q` green; `feat(api): argon2 passwords and hashed sliding sessions`.

---

### Task 5: Auth routes, cookie, dependencies, CSRF

**Files:**
- Create: `apps/api/app/auth/schemas.py`, `apps/api/app/auth/deps.py`, `apps/api/app/auth/router.py`, `apps/api/app/csrf.py`, `apps/api/tests/test_auth_routes.py`, `apps/api/tests/test_csrf.py`, `apps/api/tests/test_roles.py`
- Modify: `apps/api/app/main.py` (mount router, add middleware), `apps/api/tests/conftest.py` (helpers)

**Interfaces:**
- Endpoints: `POST /auth/register {email, password, display_name}` → 201 `UserOut` + cookie; `POST /auth/login {email, password}` → 200 `UserOut` + cookie (401 on failure, same message either way); `POST /auth/logout` → 204 + cookie cleared; `GET /auth/me` → 200 `UserOut` or 401.
- `UserOut {id, email, display_name, role}`.
- Dependencies: `current_user(request, db, settings) -> User | None`; `require_user -> User` (401); `require_role(*roles) -> Depends` (403).
- Cookie helpers `set_session_cookie(response, token, settings)`, `clear_session_cookie(response, settings)`.
- CSRF middleware: for methods other than GET/HEAD/OPTIONS, if an `Origin` header is present it must equal `settings.public_origin`; if absent and `env != "test"` → 403. (`env == "test"` clients omit Origin; `test_csrf.py` sets `env="test"` but sends a wrong Origin explicitly to prove rejection.)

- [ ] **Step 1: Failing tests**

Add to `conftest.py`:
```python
async def register(client: AsyncClient, email: str = "a@example.edu", password: str = "password-123", name: str = "Ada") -> dict[str, object]:
    r = await client.post("/api/v1/auth/register", json={"email": email, "password": password, "display_name": name})
    assert r.status_code == 201, r.text
    return r.json()
```
(`from httpx import AsyncClient` is already imported.)

`tests/test_auth_routes.py`:
```python
from httpx import AsyncClient

from tests.conftest import register


async def test_register_sets_cookie_and_me_works(client: AsyncClient) -> None:
    body = await register(client)
    assert body["role"] == "student" and body["email"] == "a@example.edu"
    assert "rt_session" in client.cookies
    me = await client.get("/api/v1/auth/me")
    assert me.status_code == 200 and me.json()["email"] == "a@example.edu"


async def test_register_duplicate_email_conflict(client: AsyncClient) -> None:
    await register(client)
    r = await client.post("/api/v1/auth/register", json={"email": "A@EXAMPLE.EDU", "password": "password-123", "display_name": "B"})
    assert r.status_code == 409


async def test_register_weak_password(client: AsyncClient) -> None:
    r = await client.post("/api/v1/auth/register", json={"email": "w@example.edu", "password": "short", "display_name": "W"})
    assert r.status_code == 422


async def test_login_logout(client: AsyncClient) -> None:
    await register(client)
    client.cookies.clear()
    assert (await client.get("/api/v1/auth/me")).status_code == 401
    bad = await client.post("/api/v1/auth/login", json={"email": "a@example.edu", "password": "nope-nope-nope"})
    assert bad.status_code == 401
    ok = await client.post("/api/v1/auth/login", json={"email": "a@example.edu", "password": "password-123"})
    assert ok.status_code == 200 and "rt_session" in client.cookies
    assert (await client.get("/api/v1/auth/me")).status_code == 200
    out = await client.post("/api/v1/auth/logout")
    assert out.status_code == 204
    assert (await client.get("/api/v1/auth/me")).status_code == 401


async def test_cookie_attributes(client: AsyncClient) -> None:
    r = await client.post("/api/v1/auth/register", json={"email": "c@example.edu", "password": "password-123", "display_name": "C"})
    set_cookie = r.headers["set-cookie"]
    assert "HttpOnly" in set_cookie and "SameSite=lax" in set_cookie and "Path=/" in set_cookie
    assert "Secure" in set_cookie  # env=test → cookie_secure True
```

`tests/test_csrf.py`:
```python
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
        headers={"Origin": "http://test"},
    )
    assert r.status_code == 401  # passed CSRF, failed auth (no such user)


async def test_get_ignores_origin(client: AsyncClient) -> None:
    r = await client.get("/api/v1/health", headers={"Origin": "https://evil.example"})
    assert r.status_code == 200
```

`tests/test_roles.py` (uses a throwaway route to exercise the dependency):
```python
from fastapi import APIRouter, Depends
from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import require_role
from app.auth.models import User, UserRole
from tests.conftest import register


async def test_require_role(client: AsyncClient, db: AsyncSession) -> None:
    app = client._transport.app  # type: ignore[attr-defined]
    probe = APIRouter()

    @probe.get("/api/v1/_probe/educator", dependencies=[Depends(require_role(UserRole.educator, UserRole.admin))])
    async def _probe() -> dict[str, bool]:
        return {"ok": True}

    app.include_router(probe)

    assert (await client.get("/api/v1/_probe/educator")).status_code == 401
    me = await register(client)
    assert (await client.get("/api/v1/_probe/educator")).status_code == 403
    await db.execute(update(User).where(User.email == me["email"]).values(role=UserRole.educator))
    await db.flush()
    assert (await client.get("/api/v1/_probe/educator")).status_code == 200
```

Run: `uv run pytest tests/test_auth_routes.py tests/test_csrf.py tests/test_roles.py -q` → 404s / ImportErrors.

- [ ] **Step 2: `schemas.py`**
```python
import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.auth.models import UserRole


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=256)
    display_name: str = Field(min_length=1, max_length=120)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(max_length=256)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    display_name: str
    role: UserRole
```
(`EmailStr` needs `email-validator`: `uv add "pydantic[email]"`.)

- [ ] **Step 3: `deps.py`**
```python
from collections.abc import Callable, Coroutine
from datetime import UTC, datetime
from typing import Any

from fastapi import Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User, UserRole
from app.auth.sessions import resolve_session
from app.config import Settings
from app.db import get_session
from app.errors import Problem
from app.main import get_settings

COOKIE = "rt_session"


def set_session_cookie(response: Response, token: str, settings: Settings) -> None:
    response.set_cookie(
        COOKIE, token, max_age=settings.session_days * 86400, path="/",
        httponly=True, secure=settings.cookie_secure, samesite="lax",
    )


def clear_session_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(COOKIE, path="/", httponly=True, secure=settings.cookie_secure, samesite="lax")


async def current_user(
    request: Request,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> User | None:
    token = request.cookies.get(COOKIE)
    if not token:
        return None
    return await resolve_session(db, token, now=datetime.now(UTC), days=settings.session_days)


async def require_user(user: User | None = Depends(current_user)) -> User:
    if user is None:
        raise Problem(401, "Not signed in")
    return user


def require_role(*roles: UserRole) -> Callable[..., Coroutine[Any, Any, User]]:
    async def _dep(user: User = Depends(require_user)) -> User:
        if user.role not in roles:
            raise Problem(403, "Insufficient role")
        return user

    return _dep
```
To avoid a circular import (`main` ↔ `deps`), move `get_settings` into `app/config.py` (it only needs `Request`): define it there and import it in `main.py` and `deps.py`.

- [ ] **Step 4: `router.py`**
```python
from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import COOKIE, clear_session_cookie, require_user, set_session_cookie
from app.auth.models import User, UserRole
from app.auth.passwords import hash_password, verify_password
from app.auth.schemas import LoginIn, RegisterIn, UserOut
from app.auth.sessions import create_session, revoke_session, user_by_email
from app.config import Settings, get_settings
from app.db import get_session
from app.errors import Problem

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=UserOut)
async def register(
    body: RegisterIn, request: Request, response: Response,
    db: AsyncSession = Depends(get_session), settings: Settings = Depends(get_settings),
) -> User:
    user = User(email=body.email, display_name=body.display_name, role=UserRole.student, password_hash=hash_password(body.password))
    db.add(user)
    try:
        await db.flush()
    except IntegrityError as exc:
        raise Problem(409, "An account with that email already exists") from exc
    token, _ = await create_session(db, user, request.headers.get("user-agent"), settings.session_days)
    await db.commit()
    set_session_cookie(response, token, settings)
    return user


@router.post("/login", response_model=UserOut)
async def login(
    body: LoginIn, request: Request, response: Response,
    db: AsyncSession = Depends(get_session), settings: Settings = Depends(get_settings),
) -> User:
    user = await user_by_email(db, body.email)
    if user is None or user.password_hash is None or not verify_password(body.password, user.password_hash) or user.deactivated_at:
        raise Problem(401, "Incorrect email or password")
    token, _ = await create_session(db, user, request.headers.get("user-agent"), settings.session_days)
    await db.commit()
    set_session_cookie(response, token, settings)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request, response: Response,
    db: AsyncSession = Depends(get_session), settings: Settings = Depends(get_settings),
) -> None:
    token = request.cookies.get(COOKIE)
    if token:
        await revoke_session(db, token)
        await db.commit()
    clear_session_cookie(response, settings)


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(require_user)) -> User:
    return user
```

- [ ] **Step 5: `csrf.py`**
```python
from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import Settings
from app.errors import problem_response

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


class OriginCheckMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: object, settings: Settings) -> None:
        super().__init__(app)  # type: ignore[arg-type]
        self.settings = settings

    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        if request.method not in SAFE_METHODS:
            origin = request.headers.get("origin")
            if origin is None:
                if self.settings.env != "test":
                    return problem_response(403, "Missing Origin header")
            elif origin.rstrip("/") != self.settings.public_origin.rstrip("/"):
                return problem_response(403, "Origin not allowed")
        return await call_next(request)
```
In `create_app`: `app.add_middleware(OriginCheckMiddleware, settings=settings)` and `app.include_router(auth_router, prefix=API_PREFIX)`.

- [ ] **Step 6: Run, lint, commit** — all tests green; `feat(api): register/login/logout/me with hashed session cookie, role dependency and Origin CSRF check`.

---

### Task 6: Google sign-in (OIDC authorization code, no Authlib)

**Files:**
- Create: `apps/api/app/auth/google.py`, `apps/api/tests/test_google.py`
- Modify: `apps/api/app/auth/router.py` (two routes), `infra/.env.example`, `infra/compose.yaml` (pass `GOOGLE_CLIENT_ID/SECRET` to `api`)

**Interfaces:**
- `GET /auth/google/start` → 302 to Google with `state` (signed with `itsdangerous.URLSafeTimedSerializer(settings.session_secret)`, also set as a 10-minute `rt_oauth_state` cookie); 404 problem when Google is not configured.
- `GET /auth/google/callback?code&state` → verifies state (cookie == query, signature valid, < 10 min), exchanges code at `https://oauth2.googleapis.com/token`, fetches `https://openidconnect.googleapis.com/v1/userinfo`; requires `email_verified`; finds `Identity(provider="google", subject=sub)` → user, else user by email (links identity), else creates `User` (role student, no password) + identity; creates a session; 302 to `settings.public_origin + "/home"` with the cookie.
- Redirect URI = `f"{settings.public_origin}/api/v1/auth/google/callback"` (register this in Google Cloud Console).

- [ ] **Step 1: Failing tests** (`respx` mocks Google)
```python
import respx
from httpx import AsyncClient, Response

from app.config import Settings
from app.main import create_app
from tests.conftest import TEST_DATABASE_URL

GOOGLE_SETTINGS = Settings(database_url=TEST_DATABASE_URL, env="test", public_origin="http://test",
                           google_client_id="cid", google_client_secret="csecret")


async def test_start_redirects_with_state(client_google: AsyncClient) -> None:
    r = await client_google.get("/api/v1/auth/google/start")
    assert r.status_code == 302
    assert r.headers["location"].startswith("https://accounts.google.com/o/oauth2/v2/auth?")
    assert "rt_oauth_state" in client_google.cookies


async def test_start_404_when_not_configured(client: AsyncClient) -> None:
    assert (await client.get("/api/v1/auth/google/start")).status_code == 404


@respx.mock
async def test_callback_creates_user_and_session(client_google: AsyncClient) -> None:
    respx.post("https://oauth2.googleapis.com/token").mock(return_value=Response(200, json={"access_token": "at", "id_token": "x"}))
    respx.get("https://openidconnect.googleapis.com/v1/userinfo").mock(
        return_value=Response(200, json={"sub": "g-123", "email": "g@example.edu", "email_verified": True, "name": "Gee"})
    )
    start = await client_google.get("/api/v1/auth/google/start")
    from urllib.parse import parse_qs, urlparse
    state = parse_qs(urlparse(start.headers["location"]).query)["state"][0]
    cb = await client_google.get(f"/api/v1/auth/google/callback?code=abc&state={state}")
    assert cb.status_code == 302 and cb.headers["location"] == "http://test/home"
    me = await client_google.get("/api/v1/auth/me")
    assert me.status_code == 200 and me.json()["email"] == "g@example.edu"


async def test_callback_bad_state(client_google: AsyncClient) -> None:
    r = await client_google.get("/api/v1/auth/google/callback?code=abc&state=forged")
    assert r.status_code == 400
```
Add a `client_google` fixture to `conftest.py`, identical to `client` but built with `GOOGLE_SETTINGS` (factor a `_make_client(settings, db)` helper used by both).

- [ ] **Step 2: Implement `google.py`**
```python
from urllib.parse import urlencode

import httpx
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.config import Settings
from app.errors import Problem

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
STATE_COOKIE = "rt_oauth_state"
STATE_MAX_AGE = 600


def _serializer(settings: Settings) -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(settings.session_secret, salt="google-oauth-state")


def redirect_uri(settings: Settings) -> str:
    return f"{settings.public_origin}/api/v1/auth/google/callback"


def build_start(settings: Settings, nonce: str) -> tuple[str, str]:
    if not settings.google_enabled:
        raise Problem(404, "Google sign-in is not configured")
    state = _serializer(settings).dumps(nonce)
    params = {
        "client_id": settings.google_client_id, "redirect_uri": redirect_uri(settings), "response_type": "code",
        "scope": "openid email profile", "state": state, "access_type": "online", "prompt": "select_account",
    }
    return f"{AUTH_URL}?{urlencode(params)}", state


def verify_state(settings: Settings, state_query: str | None, state_cookie: str | None) -> None:
    if not state_query or not state_cookie or state_query != state_cookie:
        raise Problem(400, "Invalid OAuth state")
    try:
        _serializer(settings).loads(state_query, max_age=STATE_MAX_AGE)
    except (BadSignature, SignatureExpired) as exc:
        raise Problem(400, "Invalid OAuth state") from exc


async def fetch_google_user(settings: Settings, code: str) -> dict[str, object]:
    async with httpx.AsyncClient(timeout=10) as http:
        tok = await http.post(TOKEN_URL, data={
            "code": code, "client_id": settings.google_client_id, "client_secret": settings.google_client_secret,
            "redirect_uri": redirect_uri(settings), "grant_type": "authorization_code",
        })
        if tok.status_code != 200:
            raise Problem(502, "Google token exchange failed")
        access_token = tok.json().get("access_token")
        info = await http.get(USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"})
        if info.status_code != 200:
            raise Problem(502, "Google userinfo failed")
        data: dict[str, object] = info.json()
    if not data.get("email_verified"):
        raise Problem(403, "Google account email is not verified")
    return data
```

- [ ] **Step 3: Routes** (append to `router.py`)
```python
@router.get("/google/start")
async def google_start(settings: Settings = Depends(get_settings)) -> Response:
    url, state = build_start(settings, nonce=secrets.token_urlsafe(16))
    resp = RedirectResponse(url, status_code=302)
    resp.set_cookie(STATE_COOKIE, state, max_age=STATE_MAX_AGE, path="/api/v1/auth/google",
                    httponly=True, secure=settings.cookie_secure, samesite="lax")
    return resp


@router.get("/google/callback")
async def google_callback(
    request: Request, code: str | None = None, state: str | None = None,
    db: AsyncSession = Depends(get_session), settings: Settings = Depends(get_settings),
) -> Response:
    verify_state(settings, state, request.cookies.get(STATE_COOKIE))
    if not code:
        raise Problem(400, "Missing code")
    info = await fetch_google_user(settings, code)
    sub, email, name = str(info["sub"]), str(info["email"]), str(info.get("name") or info["email"])
    identity = await db.scalar(select(Identity).where(Identity.provider == "google", Identity.subject == sub))
    if identity is not None:
        user = await db.get(User, identity.user_id)
    else:
        user = await user_by_email(db, email)
        if user is None:
            user = User(email=email, display_name=name, role=UserRole.student, password_hash=None)
            db.add(user)
            await db.flush()
        db.add(Identity(user_id=user.id, provider="google", subject=sub, email_verified=True))
        await db.flush()
    if user is None or user.deactivated_at is not None:
        raise Problem(403, "Account unavailable")
    token, _ = await create_session(db, user, request.headers.get("user-agent"), settings.session_days)
    await db.commit()
    resp = RedirectResponse(f"{settings.public_origin}/home", status_code=302)
    set_session_cookie(resp, token, settings)
    resp.delete_cookie(STATE_COOKIE, path="/api/v1/auth/google")
    return resp
```
(Imports: `secrets`, `RedirectResponse` from `fastapi.responses`, `select`, `Identity`, and the `google` helpers.)

- [ ] **Step 4: env + compose** — add to `infra/.env.example`:
```dotenv
# ---- google sign-in (optional; leave empty to hide the button) -----------
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```
and `GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:-}` / `GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET:-}` under the `api` service environment.

- [ ] **Step 5: Run, lint, commit** — `feat(api): Google sign-in via OIDC authorization code flow`.

---

### Task 7: Web — `apiFetch(event)`, `locals.user`, route guards

**Files:**
- Modify: `apps/web/src/lib/server/api.ts`, `apps/web/src/hooks.server.ts`, `apps/web/src/app.d.ts`
- Create: `apps/web/src/lib/server/guard.ts`, `apps/web/src/lib/server/guard.test.ts`, `apps/web/src/lib/server/api.test.ts` (extend)

**Interfaces:**
- `apiFetch(source: RequestEvent | typeof fetch, path, init?)`: when given a `RequestEvent`, uses `event.fetch`, forwards `event.request.headers.get('cookie')`, and sets `Origin: ORIGIN` (from `$env/dynamic/private`, default `http://localhost:8080`) on non-GET so the API's CSRF check passes.
- `relaySetCookie(event, res)`: copies every `set-cookie` from an API response onto `event.cookies` (parse name/value/attrs; use `event.cookies.set(name, value, {path, httpOnly, secure, sameSite, maxAge})`; `Max-Age=0` → `event.cookies.delete`).
- `App.User = { id: string; email: string; display_name: string; role: 'student'|'educator'|'admin' }`; `Locals.user: App.User | null`.
- `decideAccess(pathname, user) -> { allow: true } | { redirect: string }`: `/login`, `/register`, `/`, `/health` public; anything else requires a user (redirect to `/login?next=<pathname>`); `/admin/*` requires role admin; `/educator/*` requires educator or admin (403 → redirect `/home`).

- [ ] **Step 1: Failing tests**

`guard.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { decideAccess } from './guard';

const student = { id: '1', email: 's@x', display_name: 'S', role: 'student' as const };
const admin = { ...student, role: 'admin' as const };

describe('decideAccess', () => {
	it('allows public routes without a user', () => {
		expect(decideAccess('/login', null)).toEqual({ allow: true });
		expect(decideAccess('/', null)).toEqual({ allow: true });
	});
	it('redirects anonymous users to login with next', () => {
		expect(decideAccess('/home', null)).toEqual({ redirect: '/login?next=%2Fhome' });
	});
	it('enforces role prefixes', () => {
		expect(decideAccess('/admin/users', student)).toEqual({ redirect: '/home' });
		expect(decideAccess('/admin/users', admin)).toEqual({ allow: true });
		expect(decideAccess('/educator/cohorts', student)).toEqual({ redirect: '/home' });
	});
});
```
Extend `api.test.ts` with a case passing a fake `RequestEvent` (`{ fetch, request: new Request('http://x', { headers: { cookie: 'rt_session=t' } }) }`) and asserting the cookie and `origin` headers on a POST.

- [ ] **Step 2: Implement** `guard.ts`, `api.ts`, `hooks.server.ts`:

`hooks.server.ts`:
```ts
import { redirect, type Handle } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import { decideAccess } from '$lib/server/guard';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = null;
	if (event.request.headers.get('cookie')?.includes('rt_session=')) {
		try {
			const res = await apiFetch(event, '/auth/me');
			if (res.ok) event.locals.user = await res.json();
		} catch {
			/* API unreachable: treat as signed out */
		}
	}
	const decision = decideAccess(event.url.pathname, event.locals.user);
	if ('redirect' in decision) throw redirect(303, decision.redirect);
	return resolve(event);
};
```

- [ ] **Step 3: Test, lint, check, commit** — `feat(web): resolve locals.user from the API and guard routes by role` (closes #6).

---

### Task 8: Web — login, register, logout, signed-in shell

**Files:**
- Create: `apps/web/src/routes/(auth)/login/+page.svelte`, `+page.server.ts`; `(auth)/register/+page.svelte`, `+page.server.ts`; `(auth)/logout/+page.server.ts`; `(app)/+layout.server.ts`, `(app)/+layout.svelte`, `(app)/home/+page.svelte`
- Modify: `apps/web/src/routes/+page.server.ts` (redirect to `/home` when signed in), `apps/web/src/routes/+layout.svelte` (nav shows user/sign-out)

**Interfaces:** form actions `default` on login/register POST to the API via `apiFetch(event, …)`, call `relaySetCookie`, then `redirect(303, next ?? '/home')`; on API error return `fail(status, { error: problem.title, email })`. Logout action POSTs `/auth/logout`, deletes the cookie, redirects `/login`. `(app)/+layout.server.ts` returns `{ user: locals.user }`. Login page shows a "Continue with Google" link to `/api/v1/auth/google/start` only when `data.googleEnabled` (from `GET /api/v1/health`? no — add `google_enabled: bool` to the `/auth/me`-adjacent public endpoint `GET /auth/providers` in Task 6: `{"google": settings.google_enabled}`; add that route + a test there).

- [ ] Implement the pages with plain HTML forms (`method="POST"`, `use:enhance`), minimal styling, labels, and `aria-describedby` for errors. Register: email, display name, password (≥ 10 chars, `minlength="10"`). Login: email, password, hidden `next`.
- [ ] Manual verification via `make dev`: register at `/register` → lands on `/home` showing the name; sign out → `/login`; visiting `/home` signed out → `/login?next=%2Fhome`; wrong password shows the error. Record in the PR body.
- [ ] `pnpm --filter web lint && check && test`; commit `feat(web): login, register, logout pages and signed-in shell`.

---

### Task 9: Docs, PR, merge

- [ ] `docs/05-setup.md`: add "Google sign-in (optional)" — create OAuth client in Google Cloud Console, authorized redirect URI `http://localhost:8080/api/v1/auth/google/callback`, put the id/secret in `.env`, restart `api`.
- [ ] `docs/03-architecture.md` §4.2: no change needed unless the flow deviated; add the `GET /auth/providers` endpoint to §7's auth row.
- [ ] Push, `gh pr create` (title "Auth: sessions, register/login/logout, Google sign-in, route guards"), CI green, whole-branch review, merge (squash), tag `v0.1.0`? — **No**: `v0.1.0` is reserved for milestone M1 (after plan 1c). Tag `v0.0.2`.

---

## Self-review
- **Spec coverage:** ADR-0002 sessions/cookie/CSRF ✔ (Tasks 4–5); Google OAuth with email linking ✔ (Task 6); roles + `require_role` ✔ (Task 5); `hooks.server.ts` + guards ✔ (Task 7); issues #5 #7 #20 (Task 1), #9 (Task 2), #6 (Task 7) ✔; rate limiting on login/register — **deferred to plan 2** (add a note to the requirements traceability). Audit log of educator reads — plan 2 (no educator reads exist yet).
- **Placeholders:** none. Task 8's page markup is described rather than pasted; the implementer has the action contract, the form fields, and the verification list.
- **Type consistency:** `create_session(db, user, ua, days) -> tuple[str, Session]` used identically in Tasks 4/5/6; `resolve_session(db, token, now, days)`; `get_settings` lives in `app/config.py` after Task 5 (Task 1 defines it in `main.py` — **move it to `config.py` in Task 1 directly** to avoid the later shuffle); cookie name `rt_session` everywhere; `UserOut` fields match `App.User`.
