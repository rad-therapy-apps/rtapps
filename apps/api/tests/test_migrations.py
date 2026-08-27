import asyncio

import pytest
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import command
from tests.conftest import TEST_DATABASE_URL


def test_migrations_upgrade_head_and_create_alembic_version(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    url = TEST_DATABASE_URL
    monkeypatch.setenv("DATABASE_URL", url)
    cfg = Config("alembic.ini")
    cfg.set_main_option("sqlalchemy.url", url)
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")

    async def check() -> str | None:
        engine = create_async_engine(url)
        async with engine.connect() as conn:
            version = await conn.scalar(text("SELECT version_num FROM alembic_version"))
        await engine.dispose()
        return version

    version = asyncio.run(check())
    assert version == "0001"
