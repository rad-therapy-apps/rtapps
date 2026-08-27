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

    @probe.get(
        "/api/v1/_probe/educator",
        dependencies=[Depends(require_role(UserRole.educator, UserRole.admin))],
    )
    async def _probe() -> dict[str, bool]:
        return {"ok": True}

    app.include_router(probe)

    assert (await client.get("/api/v1/_probe/educator")).status_code == 401
    me = await register(client)
    assert (await client.get("/api/v1/_probe/educator")).status_code == 403
    await db.execute(update(User).where(User.email == me["email"]).values(role=UserRole.educator))
    await db.flush()
    assert (await client.get("/api/v1/_probe/educator")).status_code == 200
