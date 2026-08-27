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
    user = User(
        email=body.email,
        display_name=body.display_name,
        role=UserRole.student,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        raise Problem(409, "An account with that email already exists") from exc
    token, _ = await create_session(
        db, user, request.headers.get("user-agent"), settings.session_days
    )
    await db.commit()
    set_session_cookie(response, token, settings)
    return user


@router.post("/login", response_model=UserOut)
async def login(
    body: LoginIn, request: Request, response: Response,
    db: AsyncSession = Depends(get_session), settings: Settings = Depends(get_settings),
) -> User:
    user = await user_by_email(db, body.email)
    if (
        user is None
        or user.password_hash is None
        or not verify_password(body.password, user.password_hash)
        or user.deactivated_at
    ):
        raise Problem(401, "Incorrect email or password")
    token, _ = await create_session(
        db, user, request.headers.get("user-agent"), settings.session_days
    )
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
