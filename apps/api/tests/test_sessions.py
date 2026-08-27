from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User, UserRole
from app.auth.sessions import (
    create_session,
    hash_token,
    resolve_session,
    revoke_all_for_user,
    revoke_session,
)


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
    token, _sess = await create_session(db, u, ua=None, days=14)
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
    _t2, _ = await create_session(db, u, ua=None, days=14)
    assert await revoke_all_for_user(db, u.id) == 2
    assert await resolve_session(db, t1, now=datetime.now(UTC), days=14) is None
