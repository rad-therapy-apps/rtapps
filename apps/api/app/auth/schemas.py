"""Pydantic request/response models for `app.auth.router`.

What this file does: `RegisterIn`/`LoginIn`/`ChangePasswordIn` are the request bodies for
`/auth/register`, `/auth/login`, and `/auth/change-password`; `UserOut` is the response
shape for register/login/me.

Used here and why: plain Pydantic `BaseModel`s with `Field` length limits, so FastAPI
rejects malformed credentials with a 422 before a route body ever runs; `EmailStr` gives
email-format validation for free. `UserOut` uses `from_attributes=True` so it can be built
straight from an `app.auth.models.User` ORM instance.

How it fits the project: the request/response contract for the email+password half of
ADR-0002; never exposes `password_hash` or any session/cookie detail.

Depends on: `app.auth.models.UserRole`.
Used by: `app/auth/router.py`.
"""

import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.auth.models import UserRole


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=256)
    display_name: str = Field(min_length=1, max_length=120)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(max_length=256)


class ChangePasswordIn(BaseModel):
    current_password: str = Field(max_length=256)
    new_password: str = Field(min_length=10, max_length=256)


# Response shape for register/login/me; built from a User ORM row via from_attributes.
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    display_name: str
    role: UserRole
    must_change_password: bool
