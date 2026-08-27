from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def test_schema_is_at_head(db: AsyncSession) -> None:
    version = await db.scalar(text("SELECT version_num FROM alembic_version"))
    assert version == "0002"  # bump when a migration is added
