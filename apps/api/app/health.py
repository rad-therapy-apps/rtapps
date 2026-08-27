from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session

router = APIRouter(tags=["system"])


@router.get("/health")
async def health(session: AsyncSession = Depends(get_session)) -> dict[str, str]:  # noqa: B008
    await session.execute(text("SELECT 1"))
    return {"status": "ok", "database": "ok"}
