"""Pydantic response/request shapes for the admin API.

What this file does: `AdminUserOut` (one user row, admin view), `UserPage` (cursor-paginated
list of them), `RoleIn` (the PATCH role-change body), `ResetPasswordOut` (the temp-password
reset response), and `AuditOut` (one audit-log row with the actor's email joined in).

Used here and why: `AdminUserOut.model_config = ConfigDict(from_attributes=True)` so
`app.admin.router` can build it straight from a `User` ORM instance, same pattern as
`app.cohorts.schemas`; `RoleIn.role` is `UserRole` so an unknown role value 422s via
Pydantic's own enum validation instead of a hand-written check.

How it fits the project: FR-M-01/02/04 — the shapes `app.admin.router` returns/accepts.

Depends on: `app.auth.models.UserRole`.
Used by: `app.admin.router`; `tests/test_admin.py`.
"""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.auth.models import UserRole


# One user row as the admin API exposes it; built from a `User` ORM instance.
class AdminUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: str
    display_name: str
    role: UserRole
    deactivated_at: datetime | None
    created_at: datetime


# A page of users plus the cursor (last item's id) for the next page, or None if done.
class UserPage(BaseModel):
    items: list[AdminUserOut]
    next_cursor: str | None


# PATCH /users/{id}/role body; an unrecognised role value 422s via Pydantic's enum check.
class RoleIn(BaseModel):
    role: UserRole


# POST /users/{id}/reset-password response; the temp password is returned exactly once
# (never stored or logged in plaintext) so the admin can hand it to the user out-of-band.
class ResetPasswordOut(BaseModel):
    temporary_password: str


# One audit-log row, with the actor's email joined in (None if the actor account is gone).
class AuditOut(BaseModel):
    id: uuid.UUID
    actor_id: uuid.UUID | None
    actor_email: str | None
    action: str
    target_type: str
    target_id: uuid.UUID | None
    cohort_id: uuid.UUID | None
    request_id: str | None
    ip: str | None
    at: datetime
    detail: dict[str, Any]
