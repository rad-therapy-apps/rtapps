"""Alembic environment: wires the app's ORM metadata and async engine into Alembic's runner.

What this file does: imports every ORM models module so their tables register on
`Base.metadata` (needed for `alembic revision --autogenerate` to see them), points
Alembic's engine at `DATABASE_URL` (or `alembic.ini`'s default), and runs migrations either
"offline" (emit SQL, no DB connection) or "online" (against a real async connection).

Used here and why: SQLAlchemy's `async_engine_from_config` because the app's engine
(`app.db`) is async; Alembic itself only drives migrations synchronously, so
`do_run_migrations`/`run_async_migrations` bridge that with `connection.run_sync`.

How it fits the project: this is Alembic's entrypoint (invoked by `alembic upgrade head`,
called from `entrypoint.dev.sh` in dev and as a one-shot deploy step per ADR-0005 in prod);
`alembic/versions/*.py` are the actual migrations this file's config drives.

Depends on: `app.attempts.models`, `app.attempts.rollup`, `app.audit.models`, `app.auth.models`,
`app.cohorts.models`, `app.content.activity_models`, `app.content.models`, `app.media.models`
(imported for their side effect of registering tables on `Base.metadata`), `app.db.Base`.
Used by: the `alembic` CLI (via `alembic.ini`'s `script_location`); `tests/test_migrations.py`
indirectly, through the `migrated_db` fixture running `alembic upgrade head`.
"""

import asyncio
import os
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

import app.attempts.models  # noqa: F401, RUF100
import app.attempts.rollup  # noqa: F401, RUF100
import app.audit.models  # noqa: F401, RUF100
import app.auth.models  # noqa: F401, RUF100
import app.cohorts.models  # noqa: F401, RUF100
import app.content.activity_models  # noqa: F401, RUF100
import app.content.models  # noqa: F401, RUF100
import app.media.models  # noqa: F401, RUF100
from alembic import context
from app.db import Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# DATABASE_URL from the environment wins over alembic.ini (compose / CI / prod).
if os.environ.get("DATABASE_URL"):
    config.set_main_option("sqlalchemy.url", os.environ["DATABASE_URL"])

# The imports above populate this; autogenerate diffs the live DB against it.
target_metadata = Base.metadata


# "Offline" mode: emit the SQL a migration would run, without opening a DB connection
# (used for `alembic upgrade head --sql`-style generation, not exercised by this app's
# normal upgrade path).
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


# "Online" mode: the actual upgrade path used everywhere in this project. Builds an async
# engine, then runs the (sync) migration functions over it via `run_sync`.
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
