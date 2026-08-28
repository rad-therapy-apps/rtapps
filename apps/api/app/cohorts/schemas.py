"""Pydantic request/response models for `app.cohorts.router`.

What this file does: `CohortIn`/`CohortPatch` validate create/update bodies (name length,
threshold 0-100, optional dates); `JoinIn` normalises the join code to upper case;
`CohortOut` is the one cohort shape every route returns -- `join_code` is None when the
caller is a student (FR-E-02: only educators see/rotate the code); `MemberOut` is a roster row.
Used here and why: `Field` constraints so invalid input is a 422 before any query runs;
`field_validator` on `JoinIn.code` so `demo42` and `DEMO42` are the same code.
How it fits the project: request/response contract for FR-E-01/02/03 and FR-S-06; these
names appear in the generated `@rtapps/api-client`.
Depends on: nothing in-repo. Used by: `app.cohorts.router`, `app.analytics.schemas`
(`CohortOut` is embedded in the overview).
"""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator


class CohortIn(BaseModel):
    # Fields accepted on cohort creation; threshold defaults to 70 if omitted.
    name: str = Field(min_length=1, max_length=120)
    threshold_percent: int = Field(default=70, ge=0, le=100)
    starts_on: date | None = None
    ends_on: date | None = None


class CohortPatch(BaseModel):
    # All fields optional: only what's set (exclude_unset) is applied to the cohort.
    name: str | None = Field(default=None, min_length=1, max_length=120)
    threshold_percent: int | None = Field(default=None, ge=0, le=100)
    starts_on: date | None = None
    ends_on: date | None = None


class JoinIn(BaseModel):
    # Codes are 6-12 chars; the validator below upper-cases so case never matters.
    code: str = Field(min_length=6, max_length=12)

    @field_validator("code")
    @classmethod
    def _upper(cls, v: str) -> str:
        # Normalises case so a student typing a code read aloud always matches.
        return v.strip().upper()


class CohortOut(BaseModel):
    # The one cohort shape every route returns; join_code is hidden from students.
    id: uuid.UUID
    name: str
    join_code: str | None  # None for students
    threshold_percent: int
    starts_on: date | None
    ends_on: date | None
    role: str  # the caller's enrollment role in this cohort ("educator" for admins)
    student_count: int


class MemberOut(BaseModel):
    # One roster row: a student's identity, enrollment, and latest activity timestamp.
    user_id: uuid.UUID
    display_name: str
    email: str
    role: str
    joined_at: datetime
    last_activity_at: datetime | None  # latest submitted attempt, any activity
