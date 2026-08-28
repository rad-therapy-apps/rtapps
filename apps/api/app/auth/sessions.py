import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, cast

from sqlalchemy import CursorResult, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Session, User


def generate_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def hash_user_agent(ua: str | None) -> str | None:
    return hashlib.sha256(ua.encode()).hexdigest() if ua else None


async def create_session(
    db: AsyncSession, user: User, ua: str | None, days: int
) -> tuple[str, Session]:
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
        await db.commit()  # persist the sliding extension even on read-only requests
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
    return cast(CursorResult[Any], result).rowcount or 0


async def user_by_email(db: AsyncSession, email: str) -> User | None:
    return cast(User | None, await db.scalar(select(User).where(User.email == email)))
