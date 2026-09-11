"""Session token lifecycle: issue, resolve (with sliding expiry), and revoke.

What this file does: `create_session` issues a new opaque token and stores its hash;
`resolve_session` looks a token up, checks it's still valid, and slides its expiry forward
if it's more than half-expired; `revoke_session`/`revoke_all_for_user`/`revoke_others_for_user`
invalidate one, all, or all-but-one of a user's sessions; `user_by_email` is a small shared
lookup helper.

Used here and why: `secrets.token_urlsafe` for a cryptographically random opaque token
(not a JWT — nothing about the session is meant to be decodable client-side);
`hashlib.sha256` so the database only ever holds a hash, never the raw token, per ADR-0002.

How it fits the project: this is the token-handling core of ADR-0002's session design;
`app.auth.router` calls `create_session`/`revoke_session` on login/register/logout and
`revoke_others_for_user` on change-password, and `app.auth.deps.current_user` calls
`resolve_session` on every request that carries the `rt_session` cookie.

Depends on: `app.auth.models` (Session, User).
Used by: `app/auth/deps.py` (resolve_session), `app/auth/router.py` (create_session,
revoke_session, revoke_others_for_user, user_by_email), `tests/test_sessions.py`.
"""

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
    return hashlib.sha256(token.encode()).hexdigest()  # this hash, not the token, is stored


def hash_user_agent(ua: str | None) -> str | None:
    return hashlib.sha256(ua.encode()).hexdigest() if ua else None


# Issues a fresh token, stores only its hash (Session.id) alongside the expiry and hashed
# user agent, and returns the raw token so the caller can set it in the response cookie.
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
    # Not found, revoked, or past expiry: treat all three as "no session" (None), never an
    # error — callers (app.auth.deps.current_user) just see "not signed in".
    sess = await db.get(Session, hash_token(token))
    if sess is None or sess.revoked_at is not None or sess.expires_at <= now:
        return None
    # Also check deactivated_at here (not just at login) so deactivating a user immediately
    # invalidates any session they already hold.
    user = await db.get(User, sess.user_id)
    if user is None or user.deactivated_at is not None:
        return None
    # Sliding expiry: once a session is more than half-elapsed toward its `days` window,
    # push expires_at back out to a full `days` from now, so an active user is never logged
    # out mid-use, but an idle session still expires.
    if sess.expires_at - now < timedelta(days=days) / 2:
        sess.expires_at = now + timedelta(days=days)
        await db.commit()  # persist the sliding extension even on read-only requests
    return user


async def revoke_session(db: AsyncSession, token: str) -> None:
    # Idempotent: only sets revoked_at if it isn't already set, so calling this twice (or
    # on an already-revoked/unknown token) is a harmless no-op rather than an error.
    sess = await db.get(Session, hash_token(token))
    if sess is not None and sess.revoked_at is None:
        sess.revoked_at = datetime.now(UTC)
        await db.flush()


# Bulk revoke, e.g. "log out everywhere"; returns the count of sessions actually revoked.
async def revoke_all_for_user(db: AsyncSession, user_id: uuid.UUID) -> int:
    result = await db.execute(
        update(Session)
        .where(Session.user_id == user_id, Session.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC))
    )
    await db.flush()
    return cast(CursorResult[Any], result).rowcount or 0


async def revoke_others_for_user(db: AsyncSession, user_id: uuid.UUID, keep_session_id: str) -> int:
    """Revoke every non-expired session of the user EXCEPT keep_session_id (the caller's own).
    Used by change-password: a password change proves possession, so the current session
    survives while any other device is signed out."""
    result = await db.execute(
        update(Session)
        .where(
            Session.user_id == user_id,
            Session.revoked_at.is_(None),
            Session.id != keep_session_id,
        )
        .values(revoked_at=datetime.now(UTC))
    )
    await db.flush()
    return cast(CursorResult[Any], result).rowcount or 0


async def user_by_email(db: AsyncSession, email: str) -> User | None:
    return cast(User | None, await db.scalar(select(User).where(User.email == email)))
