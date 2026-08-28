import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.config import Settings
from app.content.models import Lesson
from app.seed import seed
from tests.conftest import TEST_DATABASE_URL


async def test_seed_is_idempotent(db: AsyncSession, settings: Settings) -> None:
    first = await seed(db, settings)
    second = await seed(db, settings)
    assert first.users_created == 3 and second.users_created == 0
    assert (await db.scalar(select(func.count()).select_from(User))) == 3
    lessons = (await db.scalars(select(Lesson))).all()
    assert {lesson.slug for lesson in lessons} == {"rbe-and-oer", "em-spectrum"} and all(
        lesson.status == "published" for lesson in lessons
    )


async def test_seed_users_can_log_in(
    client: AsyncClient, db: AsyncSession, settings: Settings
) -> None:
    await seed(db, settings)
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "educator@rtapps.dev", "password": "rtapps-dev-password"},
    )
    assert r.status_code == 200 and r.json()["role"] == "educator"


async def test_seed_refuses_prod(db: AsyncSession) -> None:
    prod = Settings(
        database_url=TEST_DATABASE_URL,
        env="prod",
        session_secret="x" * 40,
        public_origin="https://test",
    )
    with pytest.raises(RuntimeError, match="prod"):
        await seed(db, prod)
