# Phase 2 — Educator View and Deployed Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An educator creates a cohort, a student joins it by code and completes a lesson, and the educator sees that result in a cohort overview and a per-student detail — every educator read audited — with the whole stack deployable to a test VM by one workflow run. Milestone **M2**, tag `v0.2.0`.

**Architecture:** Cohorts are plain rows (`cohort`, `enrollment`) — an educator "owns" a cohort by being enrolled in it with role `educator`; ownership is checked inside the SQL query by one dependency (`require_cohort_educator`). `submit_attempt` upserts an `activity_result` rollup in the same transaction (ADR-0004), and the analytics routes read only rollups + `attempt`/`attempt_item`. Every educator read of student data and every admin mutation writes an `audit_log` row through one helper. The web app gets an `/educator` route group (SSR `load` + form actions over `apiFetch`), a join-by-code form on `/home`, and a minimal `/admin`. Deployment follows ADR-0005: `main.yml` builds multi-arch images to GHCR and dry-runs migrations; `deploy.yml` SSHes into a VM, pulls by SHA, runs `alembic upgrade head` as a one-shot step, then `up -d --wait` and a health check with rollback.

**Tech Stack:** FastAPI · SQLAlchemy 2 async · Alembic · SvelteKit / Svelte 5 · `@rtapps/api-client` · Playwright · Docker Compose (`compose.prod.yaml`) · Caddy / `cloudflared` · GitHub Actions (`docker/build-push-action`, GHCR, GitHub Environments) · `pg_dump` + `age` for backups.

## Global Constraints

- Repo `/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps`, branch `feat/educator-slice` from `main` (≥ `v0.1.0`, `a4a4a1f`); PR at the end; CI (`pr.yml`) must be green. Python via `uv run …` inside `apps/api`; JS via `pnpm`. Conventional Commits; commit after every task. Never touch `.env*` files.
- **File-header comments are mandatory** (repo standard set in 1c): every new or substantially changed hand-written source/test/config file starts with a comment block labelled `What this file does:` / `Used here and why:` / `How it fits the project:` / `Works with:` (`Depends on:` / `Used by:`), and every block of code gets a one-line comment saying what it does. Generated files (`packages/api-client/src/schema.d.ts`, `openapi.json`, lockfiles) are exempt.
- API base path `/api/v1`; errors are RFC 9457 `problem+json`; non-GET requests carry `Origin` (already enforced by `OriginCheckMiddleware`). Role gates use `require_role(UserRole.educator, UserRole.admin)`; **admin is allowed everywhere an educator is**.
- **Authorization semantics:** unknown cohort id → `404 "Cohort not found"`; existing cohort the caller is not an educator of → `403 "Not an educator of this cohort"` (AT-11 expects 403). Student endpoints never reveal other students' data (FR-S-23).
- **Join code:** 6 characters from alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no 0/O/1/I), unique; rotation replaces it in place so the old code stops working immediately (FR-E-02). Join is idempotent (second join → 200, no new row); unknown/rotated code → `404 "Join code not valid"`; an educator/admin joining as a student → `403`.
- **Rollup (`activity_result`)**, one row per `(user_id, activity_id)`: `best_percent` (max), `latest_attempt_id`, `latest_percent`, `attempts` (count of *submitted* attempts), `first_passed_at`, `mastery ∈ none|attempted|passed`. Updated inside `submit_attempt`'s transaction; an idempotent replay must **not** change it (AT-06: `attempts == 1`).
- **Audit (`audit_log`)**: columns `id, actor_id, action, target_type, target_id, cohort_id, request_id, ip, at, detail JSONB`. Written by `app.audit.service.record_audit(...)` for actions: `create_cohort`, `rotate_join_code`, `read_cohort_members`, `remove_member`, `read_cohort_overview`, `read_student_detail`, `change_role`, `deactivate_user`. `request_id` comes from the `X-Request-Id` header, which `apps/web/src/lib/server/api.ts` forwards from `event.locals.requestId`.
- **Threshold:** `cohort.threshold_percent` integer, default **70**, editable via `PATCH /cohorts/{id}`; overview marks `below_threshold = mean_best_percent is not None and mean_best_percent < threshold_percent`.
- Seed (dev/test only): existing three accounts plus cohort **"Demo cohort"** (join code `DEMO42`, threshold 70, educator enrolled as educator) and ten students `student01@example.com` … `student10@example.com` (password `rtapps-dev-password`, display names `Student 01`…`Student 10`) enrolled as students, each with one submitted attempt on `rbe-and-oer` scoring `i % 3` out of 2 for student `i` in 1…10 (so 1, 2, 0, 1, 2, …) and the rollup written through the real `upsert_activity_result`. Re-running the seed creates nothing new.
- Coverage gate unchanged (`--cov=app/grading --cov=app/auth --cov-fail-under=70`).
- Deployment is **host-agnostic**: any Ubuntu 24.04 VM with Docker Engine ≥ 27 + Compose v2, reachable over SSH. Provisioning the VM (Oracle A1 + Cloudflare Tunnel by default, Hetzner CAX11 fallback per ADR-0005) is the owner's manual step, documented in `docs/06-operations.md`; nothing in this plan requires the VM to exist to merge. Secrets live only in the GitHub Environment `test` (`DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`, `PUBLIC_URL`) and in `/opt/rtapps/.env` on the VM.
- **Deferred to plan 3** (recorded here so the reviewer does not flag them as gaps): `program` table (single institution; adding a nullable FK later is a plain migration), FR-M-03 erase, FR-E-06/07/08 activity stats / outcomes / CSV, attempt resume, Sentry, the session purge job.
- Test database on `TEST_DATABASE_URL` (CI 5433; developer machine 5434 — container `rtapps-test-pg`).

---

## File structure

| Path | Responsibility |
|---|---|
| `apps/api/app/cohorts/models.py` | `Cohort`, `Enrollment` (+ `ENROLLMENT_ROLES`, `generate_join_code`) |
| `apps/api/app/cohorts/schemas.py` | `CohortIn`, `CohortPatch`, `CohortOut`, `JoinIn`, `MemberOut` |
| `apps/api/app/cohorts/deps.py` | `require_cohort_educator(cohort_id, user, db) -> Cohort` |
| `apps/api/app/cohorts/router.py` | `POST/GET /cohorts`, `GET/PATCH /cohorts/{id}`, `POST /cohorts/{id}/rotate-code`, `POST /cohorts/join`, `GET /cohorts/{id}/members`, `DELETE /cohorts/{id}/members/{uid}` |
| `apps/api/app/attempts/rollup.py` | `ActivityResult` model + `upsert_activity_result(db, attempt)` |
| `apps/api/app/audit/models.py`, `service.py` | `AuditLog` model; `record_audit(...)`, `client_ip(request)` |
| `apps/api/app/analytics/schemas.py`, `router.py`, `queries.py` | `GET /cohorts/{id}/overview`, `GET /cohorts/{id}/students/{uid}` |
| `apps/api/app/admin/schemas.py`, `router.py` | `GET /admin/users`, `PATCH /admin/users/{id}/role`, `POST /admin/users/{id}/deactivate`, `GET /admin/audit-log` |
| `apps/api/alembic/versions/0005_cohorts_results_audit.py` | the four new tables |
| `apps/api/app/seed.py` | + demo cohort, ten students, attempts, rollups |
| `apps/api/tests/test_cohorts.py`, `test_rollup.py`, `test_analytics.py`, `test_admin.py`, `test_audit.py` | new suites; `test_seed.py`, `test_migrations.py` updated |
| `packages/api-client/openapi.json`, `src/schema.d.ts` | regenerated (`make client`) |
| `apps/web/src/lib/server/api.ts` | forwards `X-Request-Id`; new `apiJson(event, path, body, method)` helper |
| `apps/web/src/lib/server/guard.ts` | unchanged (already gates `/educator*` and `/admin*`) |
| `apps/web/src/routes/(app)/educator/+page.server.ts`, `+page.svelte` | my cohorts + create form |
| `apps/web/src/routes/(app)/educator/cohorts/[id]/+page.server.ts`, `+page.svelte` | overview, join code + rotate, threshold, roster + remove |
| `apps/web/src/routes/(app)/educator/cohorts/[id]/students/[uid]/+page.server.ts`, `+page.svelte` | student detail |
| `apps/web/src/routes/(app)/home/+page.server.ts`, `+page.svelte` | + join-by-code form + my cohorts |
| `apps/web/src/routes/(app)/admin/users/…`, `(app)/admin/audit/…` | admin users (role select, deactivate) and audit log |
| `apps/web/src/lib/cohort/format.ts` (+ test) | `formatPercent`, `belowThresholdClass` pure helpers |
| `apps/web/e2e/cohort.e2e.ts` | educator creates cohort → student joins + completes lesson → educator sees it; rotation rejects the old code |
| `infra/compose.prod.yaml`, `infra/Caddyfile.prod`, `infra/compose.tunnel.yaml`, `infra/prod.env.example`, `infra/backup/Dockerfile`, `infra/backup/backup.sh`, `infra/backup/restore.sh` | production stack (ADR-0005) |
| `.github/workflows/main.yml`, `.github/workflows/deploy.yml` | images to GHCR + migration dry-run; SSH deploy with rollback |
| `docs/06-operations.md`, `docs/adr/0001-…md` (§ Phase 2 evidence), `docs/02/03/05` updates, `README.md` | runbook, decision record evidence, status |

Task order: 1 models/migration/audit → 2 cohorts API → 3 rollup → 4 analytics → 5 admin → 6 seed → 7 client + educator pages → 8 student join + admin pages → 9 e2e + CI → 10 prod infra → 11 main.yml + deploy.yml → 12 docs/PR/merge/tag.

---

### Task 1: Models, migration 0005 and the audit helper

**Files:**
- Create: `apps/api/app/cohorts/__init__.py` (empty), `apps/api/app/cohorts/models.py`, `apps/api/app/attempts/rollup.py`, `apps/api/app/audit/__init__.py` (empty), `apps/api/app/audit/models.py`, `apps/api/app/audit/service.py`, `apps/api/alembic/versions/0005_cohorts_results_audit.py`
- Modify: `apps/api/alembic/env.py` (import the new model modules), `apps/api/tests/test_migrations.py` (head `"0005"`)
- Test: `apps/api/tests/test_cohort_models.py`, `apps/api/tests/test_audit.py`

**Interfaces:**
- Produces: `Cohort(id, name, join_code, threshold_percent, starts_on, ends_on, created_by)`, `Enrollment(id, user_id, cohort_id, role, joined_at)`, `generate_join_code() -> str`, `JOIN_CODE_ALPHABET`, `ActivityResult(user_id, activity_id, best_percent, latest_attempt_id, latest_percent, attempts, first_passed_at, mastery)`, `AuditLog(...)`, `record_audit(db, *, actor, action, target_type, target_id, cohort_id=None, request=None, detail=None) -> AuditLog`, `client_ip(request) -> str | None`.

- [ ] **Step 1: Write the failing tests**

`apps/api/tests/test_cohort_models.py`:

```python
"""What this file tests: the `cohort`/`enrollment` rows from `app.cohorts.models` and the
`activity_result` row from `app.attempts.rollup` — constraints (unique join code, unique
(user, cohort), unique (user, activity)) and the join-code generator's alphabet.
Used here and why: the real Postgres `db` fixture, because uniqueness is enforced by the
database, not by Python.
How it fits the project: the schema half of plan 2 (cohorts, ADR-0004 rollups).
Works with: pytest-asyncio, SQLAlchemy.
Depends on: `db` fixture (`conftest.py`), `seed_lesson`; `app.cohorts.models`,
`app.attempts.rollup`, `app.auth.models`.
Used by: CI `api` job; `make test-api`.
"""

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.attempts.rollup import ActivityResult
from app.auth.models import User, UserRole
from app.cohorts.models import JOIN_CODE_ALPHABET, Cohort, Enrollment, generate_join_code
from app.content.models import Activity
from tests.conftest import seed_lesson


def test_generate_join_code_shape() -> None:
    """Six characters, all from the unambiguous alphabet, and not constant."""
    codes = {generate_join_code() for _ in range(50)}
    assert all(len(c) == 6 and set(c) <= set(JOIN_CODE_ALPHABET) for c in codes)
    assert len(codes) > 1
    assert not set("0O1I") & set(JOIN_CODE_ALPHABET)


async def test_enrollment_unique_per_user_cohort(db: AsyncSession) -> None:
    """A user can be enrolled in a cohort only once; the DB refuses a duplicate."""
    edu = User(email="e@example.edu", display_name="E", role=UserRole.educator)
    db.add(edu)
    await db.flush()
    cohort = Cohort(name="C", join_code="ABCDEF", created_by=edu.id)
    db.add(cohort)
    await db.flush()
    assert cohort.threshold_percent == 70
    db.add(Enrollment(user_id=edu.id, cohort_id=cohort.id, role="educator"))
    await db.flush()
    db.add(Enrollment(user_id=edu.id, cohort_id=cohort.id, role="student"))
    with pytest.raises(IntegrityError):
        await db.flush()


async def test_join_code_unique(db: AsyncSession) -> None:
    """Two cohorts cannot share a join code."""
    edu = User(email="e2@example.edu", display_name="E", role=UserRole.educator)
    db.add(edu)
    await db.flush()
    db.add(Cohort(name="A", join_code="SAME22", created_by=edu.id))
    await db.flush()
    db.add(Cohort(name="B", join_code="SAME22", created_by=edu.id))
    with pytest.raises(IntegrityError):
        await db.flush()


async def test_activity_result_unique_per_user_activity(db: AsyncSession) -> None:
    """One rollup row per (user, activity)."""
    lesson = await seed_lesson(db)
    activity = await db.scalar(select(Activity).where(Activity.lesson_id == lesson.id))
    assert activity is not None
    user = User(email="s@example.edu", display_name="S", role=UserRole.student)
    db.add(user)
    await db.flush()
    db.add(ActivityResult(user_id=user.id, activity_id=activity.id, attempts=1, mastery="attempted"))
    await db.flush()
    db.add(ActivityResult(user_id=user.id, activity_id=activity.id, attempts=1, mastery="attempted"))
    with pytest.raises(IntegrityError):
        await db.flush()
```

`apps/api/tests/test_audit.py`:

```python
"""What this file tests: `app.audit.service.record_audit` writes one `audit_log` row with
the actor, action, target, optional cohort, and the request id / client ip taken from the
request.
Used here and why: a Starlette `Request` built from a raw ASGI scope so the header and
client-address extraction is tested without an HTTP round trip.
How it fits the project: FR-E-10 — every educator read of student data is audited; the
routes in plan 2 all call this one helper.
Works with: pytest-asyncio, Starlette.
Depends on: `db` fixture; `app.audit.service`, `app.audit.models`, `app.auth.models`.
Used by: CI `api` job; `make test-api`.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.requests import Request

from app.audit.models import AuditLog
from app.audit.service import client_ip, record_audit
from app.auth.models import User, UserRole


def _request(headers: dict[str, str], client: tuple[str, int] | None = ("10.0.0.7", 1234)) -> Request:
    raw = [(k.lower().encode(), v.encode()) for k, v in headers.items()]
    return Request({"type": "http", "method": "GET", "path": "/", "headers": raw, "client": client})


def test_client_ip_prefers_forwarded_header() -> None:
    """Behind Caddy the real address is the first X-Forwarded-For entry."""
    assert client_ip(_request({"x-forwarded-for": "203.0.113.9, 10.0.0.1"})) == "203.0.113.9"
    assert client_ip(_request({})) == "10.0.0.7"
    assert client_ip(_request({}, client=None)) is None
    assert client_ip(None) is None


async def test_record_audit_writes_row(db: AsyncSession) -> None:
    """One row per call carrying actor/action/target/cohort/request id/ip/detail."""
    actor = User(email="a@example.edu", display_name="A", role=UserRole.educator)
    db.add(actor)
    await db.flush()
    target = uuid.uuid4()
    cohort = uuid.uuid4()
    row = await record_audit(
        db,
        actor=actor,
        action="read_student_detail",
        target_type="user",
        target_id=target,
        cohort_id=cohort,
        request=_request({"x-request-id": "req-123"}),
        detail={"n": 1},
    )
    await db.flush()
    stored = await db.scalar(select(AuditLog).where(AuditLog.id == row.id))
    assert stored is not None
    assert stored.actor_id == actor.id and stored.action == "read_student_detail"
    assert stored.target_type == "user" and stored.target_id == target
    assert stored.cohort_id == cohort and stored.request_id == "req-123"
    assert stored.ip == "10.0.0.7" and stored.detail == {"n": 1} and stored.at is not None


async def test_record_audit_without_request(db: AsyncSession) -> None:
    """Callers outside HTTP (seed, scripts) can audit with no request: ip/request_id are null."""
    actor = User(email="b@example.edu", display_name="B", role=UserRole.admin)
    db.add(actor)
    await db.flush()
    row = await record_audit(db, actor=actor, action="change_role", target_type="user", target_id=actor.id)
    await db.flush()
    assert row.ip is None and row.request_id is None and row.detail == {}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/api && uv run pytest tests/test_cohort_models.py tests/test_audit.py -q`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.cohorts'`.

- [ ] **Step 3: Write the models**

`apps/api/app/cohorts/models.py`:

```python
"""SQLAlchemy ORM models for `cohort` and `enrollment`, plus the join-code generator.

What this file does: a `Cohort` is a named group of students with a rotatable join code
and a below-threshold percentage for the overview; an `Enrollment` links a user to a
cohort with a role — an educator "owns" a cohort by being enrolled in it with role
`educator` (docs/03-architecture.md §6.2).
Used here and why: SQLAlchemy 2.0 declarative models matching the rest of the app; a
CHECK constraint on `enrollment.role` (text, not a Postgres enum) like the content tables;
`secrets.choice` for the join code so codes are unpredictable; an unambiguous alphabet
(no 0/O/1/I) because codes are read aloud in classrooms.
How it fits the project: plan 2 (FR-E-01/02/03, FR-S-06). `app.cohorts.router` creates
and joins cohorts; `app.cohorts.deps.require_cohort_educator` reads `Enrollment` to
authorise; `app.analytics` joins through `Enrollment` to scope every read to one cohort.
Works with:
  Depends on: `app.auth.models.TimestampMixin`, `app.db.Base`, `app.ids.new_id`.
  Used by: `app.cohorts.router`, `app.cohorts.deps`, `app.analytics.queries`,
    `app.seed`, `alembic/env.py`, `tests/test_cohort_models.py`.
"""

import secrets
import uuid
from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.auth.models import TimestampMixin, User
from app.db import Base
from app.ids import new_id

# Unambiguous characters only — no 0/O or 1/I — because codes are read out loud.
JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
JOIN_CODE_LENGTH = 6
ENROLLMENT_ROLES = ("student", "educator")


def generate_join_code() -> str:
    """Six random characters from the unambiguous alphabet (uniqueness is enforced by the DB)."""
    return "".join(secrets.choice(JOIN_CODE_ALPHABET) for _ in range(JOIN_CODE_LENGTH))


class Cohort(TimestampMixin, Base):
    __tablename__ = "cohort"
    __table_args__ = (
        CheckConstraint(
            "threshold_percent >= 0 AND threshold_percent <= 100", name="ck_cohort_threshold"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    join_code: Mapped[str] = mapped_column(String(12), unique=True, nullable=False)
    threshold_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=70)
    starts_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    ends_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="SET NULL"), nullable=True
    )

    enrollments: Mapped[list["Enrollment"]] = relationship(
        back_populates="cohort", cascade="all, delete-orphan"
    )


class Enrollment(Base):
    __tablename__ = "enrollment"
    __table_args__ = (
        UniqueConstraint("user_id", "cohort_id", name="uq_enrollment_user_cohort"),
        CheckConstraint("role IN ('student', 'educator')", name="ck_enrollment_role"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True
    )
    cohort_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("cohort.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="student")
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    cohort: Mapped[Cohort] = relationship(back_populates="enrollments")
    user: Mapped[User] = relationship()
```

`apps/api/app/attempts/rollup.py` (model only in this task; `upsert_activity_result` arrives in Task 3):

```python
"""The `activity_result` rollup: one row per (user, activity) summarising their attempts.

What this file does: defines `ActivityResult` (best/latest percent, attempt count, first
pass, mastery) and — from Task 3 — `upsert_activity_result`, which `submit_attempt` calls
inside its transaction so the row is never out of step with `attempt`.
Used here and why: a denormalised row so cohort views read one row per student-activity
instead of aggregating every attempt on each page load (FR-X-02; docs/03-architecture.md
§6.2 "the row analytics read most"). `mastery` is text with a CHECK constraint.
How it fits the project: ADR-0004 — attempts are the spine, rollups are the read model.
Works with:
  Depends on: `app.db.Base`, `app.ids.new_id`, `app.attempts.models.Attempt`.
  Used by: `app.attempts.router.submit_attempt`, `app.analytics.queries`, `app.seed`,
    `alembic/env.py`, `tests/test_rollup.py`.
"""

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.ids import new_id

MASTERY_LEVELS = ("none", "attempted", "passed")


class ActivityResult(Base):
    __tablename__ = "activity_result"
    __table_args__ = (
        UniqueConstraint("user_id", "activity_id", name="uq_activity_result_user_activity"),
        CheckConstraint("mastery IN ('none', 'attempted', 'passed')", name="ck_activity_result_mastery"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    activity_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("activity.id", ondelete="CASCADE"), nullable=False, index=True
    )
    best_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    latest_attempt_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("attempt.id", ondelete="SET NULL"), nullable=True
    )
    latest_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    first_passed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    mastery: Mapped[str] = mapped_column(String(20), nullable=False, default="none")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
```

`apps/api/app/audit/models.py`:

```python
"""SQLAlchemy ORM model for `audit_log` — who did what to whom, and from where.

What this file does: an append-only row per audited action (FR-E-10, FR-M-01): actor,
action name, target (type + id), optional cohort context, the request id the web app
stamped on the request, the client ip, and a free-form JSONB `detail`.
Used here and why: no `updated_at` and no ORM relationships on purpose — rows are never
edited, and reads (admin audit-log view) join by id explicitly.
How it fits the project: written only through `app.audit.service.record_audit`; read by
`app.admin.router` (`GET /admin/audit-log`). Retention ≥ 2 years (NFR-26) is a policy
note in docs/06-operations.md, not enforced in code yet.
Works with:
  Depends on: `app.db.Base`, `app.ids.new_id`.
  Used by: `app.audit.service`, `app.admin.router`, `alembic/env.py`, tests.
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.ids import new_id


class AuditLog(Base):
    __tablename__ = "audit_log"
    __table_args__ = (Index("ix_audit_log_at", "at"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="SET NULL"), nullable=True, index=True
    )
    action: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    target_type: Mapped[str] = mapped_column(String(30), nullable=False)
    target_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    cohort_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    request_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)  # IPv6 max length
    at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    detail: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
```

`apps/api/app/audit/service.py`:

```python
"""The one helper every audited route calls: `record_audit`.

What this file does: builds an `AuditLog` row from the acting user, an action name, the
target, and (optionally) the request — pulling the request id and client ip from headers.
Used here and why: a single function so the audit row shape is identical everywhere and
tests can assert on it; `X-Forwarded-For` is honoured because the API always sits behind
Caddy (ADR-0002/0005) and would otherwise log the proxy's address.
How it fits the project: FR-E-10 (educator reads audited) and FR-M-01 (role changes
audited). Callers add the row to the *same* session as the read/mutation, so the audit
entry commits with it.
Works with:
  Depends on: `app.audit.models.AuditLog`, `app.auth.models.User`, Starlette `Request`.
  Used by: `app.cohorts.router`, `app.analytics.router`, `app.admin.router`,
    `tests/test_audit.py`.
"""

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from starlette.requests import Request

from app.audit.models import AuditLog
from app.auth.models import User


def client_ip(request: Request | None) -> str | None:
    """First X-Forwarded-For hop (set by the proxy), else the socket peer, else None."""
    if request is None:
        return None
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()[:45]
    return request.client.host if request.client else None


async def record_audit(
    db: AsyncSession,
    *,
    actor: User,
    action: str,
    target_type: str,
    target_id: uuid.UUID | None,
    cohort_id: uuid.UUID | None = None,
    request: Request | None = None,
    detail: dict[str, Any] | None = None,
) -> AuditLog:
    """Add (not commit) one audit row; the caller's transaction decides when it lands."""
    row = AuditLog(
        actor_id=actor.id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        cohort_id=cohort_id,
        request_id=(request.headers.get("x-request-id") if request else None),
        ip=client_ip(request),
        detail=detail or {},
    )
    db.add(row)
    return row
```

- [ ] **Step 4: Write the migration and register the models**

`apps/api/alembic/versions/0005_cohorts_results_audit.py`:

```python
"""cohorts, results, audit: cohort, enrollment, activity_result, audit_log

What this file does: creates the four plan-2 tables.
How it fits the project: fifth link in the chain; FKs into `user` (0002), `activity` (0003)
and `attempt` (0004).
Depends on: `0004_attempts.py`. Used by: `tests/test_migrations.py` (head "0005").

Revision ID: 0005
Revises: 0004
Create Date: 2026-08-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "cohort",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("join_code", sa.String(12), nullable=False, unique=True),
        sa.Column("threshold_percent", sa.Integer(), nullable=False, server_default="70"),
        sa.Column("starts_on", sa.Date(), nullable=True),
        sa.Column("ends_on", sa.Date(), nullable=True),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("threshold_percent >= 0 AND threshold_percent <= 100", name="ck_cohort_threshold"),
    )
    op.create_table(
        "enrollment",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("cohort_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cohort.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="student"),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "cohort_id", name="uq_enrollment_user_cohort"),
        sa.CheckConstraint("role IN ('student', 'educator')", name="ck_enrollment_role"),
    )
    op.create_index("ix_enrollment_user_id", "enrollment", ["user_id"])
    op.create_index("ix_enrollment_cohort_id", "enrollment", ["cohort_id"])
    op.create_table(
        "activity_result",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("activity_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("activity.id", ondelete="CASCADE"), nullable=False),
        sa.Column("best_percent", sa.Float(), nullable=True),
        sa.Column("latest_attempt_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("attempt.id", ondelete="SET NULL"), nullable=True),
        sa.Column("latest_percent", sa.Float(), nullable=True),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("first_passed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("mastery", sa.String(20), nullable=False, server_default="none"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "activity_id", name="uq_activity_result_user_activity"),
        sa.CheckConstraint("mastery IN ('none', 'attempted', 'passed')", name="ck_activity_result_mastery"),
    )
    op.create_index("ix_activity_result_activity_id", "activity_result", ["activity_id"])
    op.create_table(
        "audit_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(60), nullable=False),
        sa.Column("target_type", sa.String(30), nullable=False),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("cohort_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("request_id", sa.String(64), nullable=True),
        sa.Column("ip", sa.String(45), nullable=True),
        sa.Column("at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("detail", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"),
    )
    for col in ("actor_id", "action", "target_id", "cohort_id", "at"):
        op.create_index(f"ix_audit_log_{col}", "audit_log", [col])


def downgrade() -> None:
    op.drop_table("audit_log")
    op.drop_table("activity_result")
    op.drop_table("enrollment")
    op.drop_table("cohort")
```

In `apps/api/alembic/env.py`, next to the existing model imports add (keep the `# noqa: F401` style already used there):

```python
import app.attempts.rollup  # noqa: F401
import app.audit.models  # noqa: F401
import app.cohorts.models  # noqa: F401
```

In `apps/api/tests/test_migrations.py` change `assert version == "0004"` to `"0005"`.

- [ ] **Step 5: Run the tests, lint, types**

Run: `cd apps/api && uv run pytest tests/test_cohort_models.py tests/test_audit.py tests/test_migrations.py -q && uv run ruff check . && uv run ruff format --check . && uv run mypy app`
Expected: all PASS (ruff may ask to reformat the long `sa.Column(...)` lines — run `uv run ruff format .` and re-check). Then the whole suite: `uv run pytest -q` — all green.

- [ ] **Step 6: Commit**

```bash
git add apps/api/app/cohorts apps/api/app/audit apps/api/app/attempts/rollup.py apps/api/alembic tests
git commit -m "feat(api): cohort, enrollment, activity_result and audit_log tables with audit helper"
```

### Task 2: Cohorts API — create, list, get, patch, rotate code, join, members, remove

**Files:**
- Create: `apps/api/app/cohorts/schemas.py`, `apps/api/app/cohorts/deps.py`, `apps/api/app/cohorts/router.py`
- Modify: `apps/api/app/main.py` (mount `cohorts_router`)
- Test: `apps/api/tests/test_cohorts.py`

**Interfaces:**
- Consumes: Task 1 models, `record_audit`, `require_user`, `require_role`.
- Produces: `require_cohort_educator(cohort_id: uuid.UUID, user=Depends(require_user), db=Depends(get_session)) -> Cohort` (404 unknown, 403 not an educator of it; admins pass for any existing cohort); `CohortOut {id, name, join_code|null, threshold_percent, starts_on, ends_on, role, student_count}` (`join_code` is **null for students**), `MemberOut {user_id, display_name, email, role, joined_at, last_activity_at}`. Routes (all under `/cohorts`): `POST /` (educator|admin) 201; `GET /` (mine); `GET /{id}` (member); `PATCH /{id}` (educator of it); `POST /{id}/rotate-code` (educator of it) → `CohortOut`; `POST /join {code}` (student) → `CohortOut` 200; `GET /{id}/members` (educator of it, audited `read_cohort_members`) → `list[MemberOut]` students only; `DELETE /{id}/members/{uid}` (educator of it, audited `remove_member`) 204.

- [ ] **Step 1: Write the failing tests** — `apps/api/tests/test_cohorts.py`

```python
"""What this file tests: every route in `app.cohorts.router` plus the
`require_cohort_educator` dependency — the permission matrix (student / other educator /
owner / admin), join-code rotation (AT-04), idempotent join, roster and removal, and the
audit rows those reads and writes leave behind.
Used here and why: httpx against the ASGI app with real Postgres (`client`/`db`); two
helpers promote a registered user to educator/admin by direct UPDATE, since role changes
are an admin route tested separately.
How it fits the project: FR-E-01/02/03/09/10, FR-S-06; docs/03-architecture.md §7 (cohorts).
Works with: pytest-asyncio, httpx.
Depends on: `client`, `db` fixtures and `register` from `conftest.py`; `app.audit.models`.
Used by: CI `api` job; `make test-api`.
"""

import uuid
from typing import Any

from httpx import AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.models import AuditLog
from app.auth.models import User, UserRole
from tests.conftest import register


async def promote(db: AsyncSession, email: str, role: UserRole) -> None:
    """Set a registered user's role directly (the admin route is covered in test_admin.py)."""
    await db.execute(update(User).where(User.email == email).values(role=role))
    await db.flush()


async def login(client: AsyncClient, email: str, password: str = "password-123") -> None:
    r = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text


async def make_educator(client: AsyncClient, db: AsyncSession, email: str) -> None:
    """Register, promote to educator, and re-login so the session sees the new role."""
    await register(client, email=email, name=email.split("@")[0])
    await promote(db, email, UserRole.educator)


async def create_cohort(client: AsyncClient, name: str = "Fall 2026") -> dict[str, Any]:
    r = await client.post("/api/v1/cohorts", json={"name": name})
    assert r.status_code == 201, r.text
    body: dict[str, Any] = r.json()
    assert body["role"] == "educator" and len(body["join_code"]) == 6
    assert body["threshold_percent"] == 70 and body["student_count"] == 0
    return body


async def test_student_cannot_create_cohort(client: AsyncClient) -> None:
    await register(client)
    r = await client.post("/api/v1/cohorts", json={"name": "X"})
    assert r.status_code == 403


async def test_create_list_get_patch(client: AsyncClient, db: AsyncSession) -> None:
    """Owner sees the cohort in their list, can read and patch it; audit row for create."""
    await make_educator(client, db, "edu@example.edu")
    cohort = await create_cohort(client)
    listed = (await client.get("/api/v1/cohorts")).json()
    assert [c["id"] for c in listed] == [cohort["id"]]
    got = (await client.get(f"/api/v1/cohorts/{cohort['id']}")).json()
    assert got["name"] == "Fall 2026" and got["join_code"] == cohort["join_code"]
    r = await client.patch(
        f"/api/v1/cohorts/{cohort['id']}",
        json={"name": "Fall 26", "threshold_percent": 60, "starts_on": "2026-09-01"},
    )
    assert r.status_code == 200 and r.json()["threshold_percent"] == 60
    assert r.json()["name"] == "Fall 26" and r.json()["starts_on"] == "2026-09-01"
    r = await client.patch(f"/api/v1/cohorts/{cohort['id']}", json={"threshold_percent": 101})
    assert r.status_code == 422
    rows = (await db.scalars(select(AuditLog).where(AuditLog.action == "create_cohort"))).all()
    assert len(rows) == 1 and rows[0].cohort_id == uuid.UUID(cohort["id"])


async def test_join_rotate_and_idempotency(client: AsyncClient, db: AsyncSession) -> None:
    """AT-04: A joins with the code (twice, one row); after rotation B's old code is refused."""
    await make_educator(client, db, "edu@example.edu")
    cohort = await create_cohort(client)
    code = cohort["join_code"]

    await register(client, email="a@example.edu", name="A")
    r = await client.post("/api/v1/cohorts/join", json={"code": code})
    assert r.status_code == 200 and r.json()["id"] == cohort["id"]
    assert r.json()["role"] == "student" and r.json()["join_code"] is None  # students never see it
    again = await client.post("/api/v1/cohorts/join", json={"code": code.lower()})  # case-insensitive
    assert again.status_code == 200 and again.json()["student_count"] == 1
    mine = (await client.get("/api/v1/cohorts")).json()
    assert len(mine) == 1 and mine[0]["role"] == "student"
    # Students can read their cohort (name only, no code) but not patch or rotate it.
    assert (await client.get(f"/api/v1/cohorts/{cohort['id']}")).status_code == 200
    assert (await client.patch(f"/api/v1/cohorts/{cohort['id']}", json={"name": "x"})).status_code == 403
    assert (await client.post(f"/api/v1/cohorts/{cohort['id']}/rotate-code")).status_code == 403

    await login(client, "edu@example.edu")
    r = await client.post(f"/api/v1/cohorts/{cohort['id']}/rotate-code")
    assert r.status_code == 200 and r.json()["join_code"] != code and len(r.json()["join_code"]) == 6

    await register(client, email="b@example.edu", name="B")
    r = await client.post("/api/v1/cohorts/join", json={"code": code})
    assert r.status_code == 404 and r.json()["title"] == "Join code not valid"
    assert (await client.post("/api/v1/cohorts/join", json={"code": "ZZ"})).status_code == 422
    rotations = (await db.scalars(select(AuditLog).where(AuditLog.action == "rotate_join_code"))).all()
    assert len(rotations) == 1


async def test_educator_cannot_join_as_student(client: AsyncClient, db: AsyncSession) -> None:
    await make_educator(client, db, "edu@example.edu")
    cohort = await create_cohort(client)
    r = await client.post("/api/v1/cohorts/join", json={"code": cohort["join_code"]})
    assert r.status_code == 403


async def test_other_educator_gets_403_unknown_gets_404(client: AsyncClient, db: AsyncSession) -> None:
    """FR-E-09: ownership is enforced per cohort, not per role."""
    await make_educator(client, db, "e1@example.edu")
    cohort = await create_cohort(client)
    await make_educator(client, db, "e2@example.edu")
    for path in (f"/api/v1/cohorts/{cohort['id']}", f"/api/v1/cohorts/{cohort['id']}/members"):
        assert (await client.get(path)).status_code == 403
    assert (await client.post(f"/api/v1/cohorts/{cohort['id']}/rotate-code")).status_code == 403
    assert (await client.get(f"/api/v1/cohorts/{uuid.uuid4()}")).status_code == 404
    assert (await client.get("/api/v1/cohorts")).json() == []


async def test_admin_can_read_any_cohort(client: AsyncClient, db: AsyncSession) -> None:
    await make_educator(client, db, "e1@example.edu")
    cohort = await create_cohort(client)
    await register(client, email="root@example.edu", name="Root")
    await promote(db, "root@example.edu", UserRole.admin)
    assert (await client.get(f"/api/v1/cohorts/{cohort['id']}/members")).status_code == 200


async def test_members_and_remove(client: AsyncClient, db: AsyncSession) -> None:
    """Roster lists students only (not the educator); removal is audited and idempotent-safe."""
    await make_educator(client, db, "edu@example.edu")
    cohort = await create_cohort(client)
    await register(client, email="a@example.edu", name="Ada")
    await client.post("/api/v1/cohorts/join", json={"code": cohort["join_code"]})
    await login(client, "edu@example.edu")

    r = await client.get(f"/api/v1/cohorts/{cohort['id']}/members")
    assert r.status_code == 200
    members = r.json()
    assert [m["email"] for m in members] == ["a@example.edu"]
    assert members[0]["display_name"] == "Ada" and members[0]["role"] == "student"
    assert members[0]["joined_at"] and members[0]["last_activity_at"] is None
    uid = members[0]["user_id"]

    r = await client.delete(f"/api/v1/cohorts/{cohort['id']}/members/{uid}")
    assert r.status_code == 204
    assert (await client.get(f"/api/v1/cohorts/{cohort['id']}/members")).json() == []
    assert (await client.delete(f"/api/v1/cohorts/{cohort['id']}/members/{uid}")).status_code == 404

    actions = (await db.scalars(select(AuditLog.action).order_by(AuditLog.at))).all()
    assert actions.count("read_cohort_members") == 2 and actions.count("remove_member") == 1
    # The removed student can re-join with the current code.
    await login(client, "a@example.edu")
    assert (await client.post("/api/v1/cohorts/join", json={"code": cohort["join_code"]})).status_code == 200
```

- [ ] **Step 2: Run to verify failure**

Run: `cd apps/api && uv run pytest tests/test_cohorts.py -q` → FAIL (404s / 405s everywhere, no router mounted).

- [ ] **Step 3: Schemas**

`apps/api/app/cohorts/schemas.py`:

```python
"""Pydantic request/response models for `app.cohorts.router`.

What this file does: `CohortIn`/`CohortPatch` validate create/update bodies (name length,
threshold 0–100, optional dates); `JoinIn` normalises the join code to upper case;
`CohortOut` is the one cohort shape every route returns — `join_code` is None when the
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
    name: str = Field(min_length=1, max_length=120)
    threshold_percent: int = Field(default=70, ge=0, le=100)
    starts_on: date | None = None
    ends_on: date | None = None


class CohortPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    threshold_percent: int | None = Field(default=None, ge=0, le=100)
    starts_on: date | None = None
    ends_on: date | None = None


class JoinIn(BaseModel):
    code: str = Field(min_length=6, max_length=12)

    @field_validator("code")
    @classmethod
    def _upper(cls, v: str) -> str:
        return v.strip().upper()


class CohortOut(BaseModel):
    id: uuid.UUID
    name: str
    join_code: str | None  # None for students
    threshold_percent: int
    starts_on: date | None
    ends_on: date | None
    role: str  # the caller's enrollment role in this cohort ("educator" for admins)
    student_count: int


class MemberOut(BaseModel):
    user_id: uuid.UUID
    display_name: str
    email: str
    role: str
    joined_at: datetime
    last_activity_at: datetime | None  # latest submitted attempt, any activity
```

- [ ] **Step 4: Dependency**

`apps/api/app/cohorts/deps.py`:

```python
"""`require_cohort_educator` — the one authorization dependency for educator cohort routes.

What this file does: loads the cohort by id (404 if missing) and checks, in SQL, that the
caller is enrolled in it with role `educator` — or is an admin (403 otherwise).
Used here and why: a FastAPI dependency taking the `cohort_id` path parameter, so every
educator route declares `cohort: Cohort = Depends(require_cohort_educator)` and gets both
the row and the authorization in one line (docs/03-architecture.md §8: "cohort ownership is
enforced inside the query, never by trusting client-supplied ids").
How it fits the project: FR-E-09 / NFR-11. Used by cohorts and analytics routers alike so
the two can never drift in what "educator of this cohort" means.
Depends on: `app.cohorts.models`, `app.auth.deps.require_user`, `app.auth.models`,
`app.db.get_session`, `app.errors.Problem`.
Used by: `app.cohorts.router`, `app.analytics.router`, `tests/test_cohorts.py`.
"""

import uuid

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import require_user
from app.auth.models import User, UserRole
from app.cohorts.models import Cohort, Enrollment
from app.db import get_session
from app.errors import Problem


async def require_cohort_educator(
    cohort_id: uuid.UUID,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_session),
) -> Cohort:
    cohort = await db.get(Cohort, cohort_id)
    if cohort is None:
        raise Problem(404, "Cohort not found")
    if user.role == UserRole.admin:
        return cohort
    enrolled = await db.scalar(
        select(Enrollment.id).where(
            Enrollment.cohort_id == cohort.id,
            Enrollment.user_id == user.id,
            Enrollment.role == "educator",
        )
    )
    if enrolled is None:
        raise Problem(403, "Not an educator of this cohort")
    return cohort
```

- [ ] **Step 5: Router**

`apps/api/app/cohorts/router.py`:

```python
"""Routes for cohorts: create/list/get/patch, join-code rotation, student join, roster.

What this file does: educators create cohorts (becoming their educator by enrollment),
rotate the join code, read and prune the roster; students join by code and see the cohorts
they belong to. Reads of student data and every mutation write an audit row.
Used here and why: `require_cohort_educator` for ownership; `cohort_out` builds the one
response shape (hiding the join code from students); join codes are checked for
collision before use (the unique index remains the final guard against a race).
How it fits the project: FR-E-01/02/03/09/10, FR-S-06; `docs/03-architecture.md` §7.
Depends on: `app.cohorts.models`, `app.cohorts.schemas`, `app.cohorts.deps`,
`app.audit.service.record_audit`, `app.auth.deps`, `app.auth.models`,
`app.attempts.models.Attempt` (roster last-activity), `app.db`, `app.errors`.
Used by: `app.main` (mounted); `tests/test_cohorts.py`.
"""

import uuid

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.attempts.models import Attempt
from app.audit.service import record_audit
from app.auth.deps import require_role, require_user
from app.auth.models import User, UserRole
from app.cohorts.deps import require_cohort_educator
from app.cohorts.models import Cohort, Enrollment, generate_join_code
from app.cohorts.schemas import CohortIn, CohortOut, CohortPatch, JoinIn, MemberOut
from app.db import get_session
from app.errors import Problem

router = APIRouter(prefix="/cohorts", tags=["cohorts"])
JOIN_CODE_RETRIES = 5


async def _student_count(db: AsyncSession, cohort_id: uuid.UUID) -> int:
    n = await db.scalar(
        select(func.count()).select_from(Enrollment).where(
            Enrollment.cohort_id == cohort_id, Enrollment.role == "student"
        )
    )
    return int(n or 0)


async def cohort_out(db: AsyncSession, cohort: Cohort, role: str) -> CohortOut:
    """Serialise a cohort for a caller with the given enrollment role (students get no code)."""
    return CohortOut(
        id=cohort.id,
        name=cohort.name,
        join_code=cohort.join_code if role == "educator" else None,
        threshold_percent=cohort.threshold_percent,
        starts_on=cohort.starts_on,
        ends_on=cohort.ends_on,
        role=role,
        student_count=await _student_count(db, cohort.id),
    )


async def _assign_fresh_code(db: AsyncSession, cohort: Cohort) -> None:
    """Pick a join code no other cohort uses (the unique index is the final guard)."""
    for _ in range(JOIN_CODE_RETRIES):
        code = generate_join_code()
        taken = await db.scalar(select(Cohort.id).where(Cohort.join_code == code))
        if taken is None:
            cohort.join_code = code
            return
    raise Problem(500, "Could not allocate a join code")


@router.post("", status_code=status.HTTP_201_CREATED, response_model=CohortOut)
async def create_cohort(
    body: CohortIn,
    request: Request,
    user: User = Depends(require_role(UserRole.educator, UserRole.admin)),
    db: AsyncSession = Depends(get_session),
) -> CohortOut:
    cohort = Cohort(
        name=body.name,
        join_code=generate_join_code(),
        threshold_percent=body.threshold_percent,
        starts_on=body.starts_on,
        ends_on=body.ends_on,
        created_by=user.id,
    )
    await _assign_fresh_code(db, cohort)
    db.add(cohort)
    await db.flush()  # assign the id before the enrollment references it
    db.add(Enrollment(user_id=user.id, cohort_id=cohort.id, role="educator"))
    await record_audit(
        db, actor=user, action="create_cohort", target_type="cohort", target_id=cohort.id,
        cohort_id=cohort.id, request=request,
    )
    await db.commit()
    return await cohort_out(db, cohort, "educator")


@router.get("", response_model=list[CohortOut])
async def list_my_cohorts(
    user: User = Depends(require_user), db: AsyncSession = Depends(get_session)
) -> list[CohortOut]:
    rows = await db.execute(
        select(Cohort, Enrollment.role)
        .join(Enrollment, Enrollment.cohort_id == Cohort.id)
        .where(Enrollment.user_id == user.id)
        .order_by(Cohort.created_at.desc())
    )
    return [await cohort_out(db, c, role) for c, role in rows.all()]


@router.get("/{cohort_id}", response_model=CohortOut)
async def get_cohort(
    cohort_id: uuid.UUID,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_session),
) -> CohortOut:
    cohort = await db.get(Cohort, cohort_id)
    if cohort is None:
        raise Problem(404, "Cohort not found")
    if user.role == UserRole.admin:
        return await cohort_out(db, cohort, "educator")
    role = await db.scalar(
        select(Enrollment.role).where(Enrollment.cohort_id == cohort.id, Enrollment.user_id == user.id)
    )
    if role is None:
        raise Problem(403, "Not a member of this cohort")
    return await cohort_out(db, cohort, role)


@router.patch("/{cohort_id}", response_model=CohortOut)
async def patch_cohort(
    body: CohortPatch,
    cohort: Cohort = Depends(require_cohort_educator),
    db: AsyncSession = Depends(get_session),
) -> CohortOut:
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(cohort, field, value)
    await db.commit()
    return await cohort_out(db, cohort, "educator")


@router.post("/{cohort_id}/rotate-code", response_model=CohortOut)
async def rotate_code(
    request: Request,
    cohort: Cohort = Depends(require_cohort_educator),
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_session),
) -> CohortOut:
    await _assign_fresh_code(db, cohort)
    await record_audit(
        db, actor=user, action="rotate_join_code", target_type="cohort", target_id=cohort.id,
        cohort_id=cohort.id, request=request,
    )
    await db.commit()
    return await cohort_out(db, cohort, "educator")


@router.post("/join", response_model=CohortOut)
async def join_cohort(
    body: JoinIn,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_session),
) -> CohortOut:
    if user.role != UserRole.student:
        raise Problem(403, "Only students can join a cohort by code")
    cohort = await db.scalar(select(Cohort).where(Cohort.join_code == body.code))
    if cohort is None:
        raise Problem(404, "Join code not valid")
    existing = await db.scalar(
        select(Enrollment).where(Enrollment.cohort_id == cohort.id, Enrollment.user_id == user.id)
    )
    if existing is None:  # idempotent: a second join is a no-op
        db.add(Enrollment(user_id=user.id, cohort_id=cohort.id, role="student"))
        await db.commit()
    return await cohort_out(db, cohort, "student")


@router.get("/{cohort_id}/members", response_model=list[MemberOut])
async def list_members(
    request: Request,
    cohort: Cohort = Depends(require_cohort_educator),
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_session),
) -> list[MemberOut]:
    last_activity = (
        select(Attempt.user_id, func.max(Attempt.submitted_at).label("last_at"))
        .where(Attempt.status == "submitted")
        .group_by(Attempt.user_id)
        .subquery()
    )
    rows = await db.execute(
        select(User, Enrollment, last_activity.c.last_at)
        .join(Enrollment, Enrollment.user_id == User.id)
        .outerjoin(last_activity, last_activity.c.user_id == User.id)
        .where(Enrollment.cohort_id == cohort.id, Enrollment.role == "student")
        .order_by(User.display_name)
    )
    members = [
        MemberOut(
            user_id=u.id, display_name=u.display_name, email=u.email, role=e.role,
            joined_at=e.joined_at, last_activity_at=last_at,
        )
        for u, e, last_at in rows.all()
    ]
    await record_audit(
        db, actor=user, action="read_cohort_members", target_type="cohort", target_id=cohort.id,
        cohort_id=cohort.id, request=request, detail={"count": len(members)},
    )
    await db.commit()
    return members


@router.delete("/{cohort_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    user_id: uuid.UUID,
    request: Request,
    cohort: Cohort = Depends(require_cohort_educator),
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_session),
) -> None:
    result = await db.execute(
        delete(Enrollment).where(
            Enrollment.cohort_id == cohort.id, Enrollment.user_id == user_id, Enrollment.role == "student"
        )
    )
    if result.rowcount == 0:
        raise Problem(404, "Member not found")
    await record_audit(
        db, actor=user, action="remove_member", target_type="user", target_id=user_id,
        cohort_id=cohort.id, request=request,
    )
    await db.commit()
```

Mount it in `app/main.py`: `from app.cohorts.router import router as cohorts_router` and `app.include_router(cohorts_router, prefix=API_PREFIX)` after the attempts router (and add `app.cohorts.router` to the docstring's Depends list).

Note on route ordering: `/join` is declared after `/{cohort_id}` in the file, but the `POST /join` cannot collide with `GET /{cohort_id}`; the only same-method overlap would be `POST /{cohort_id}/rotate-code`, which has an extra segment. Keep `/join` a POST.

- [ ] **Step 6: Run tests, lint, types; format long lines**

Run: `cd apps/api && uv run ruff format . && uv run pytest tests/test_cohorts.py -q && uv run ruff check . && uv run mypy app` → PASS. Then `uv run pytest -q` → all green.

- [ ] **Step 7: Commit**

```bash
git add apps/api/app/cohorts apps/api/app/main.py apps/api/tests/test_cohorts.py
git commit -m "feat(api): cohorts — create, join by code, rotate, roster, audited"
```

### Task 3: `activity_result` rollup on submit

**Files:**
- Modify: `apps/api/app/attempts/rollup.py` (add `upsert_activity_result`), `apps/api/app/attempts/router.py` (`submit_attempt` calls it before commit)
- Test: `apps/api/tests/test_rollup.py`

**Interfaces:**
- Produces: `async def upsert_activity_result(db: AsyncSession, attempt: Attempt) -> ActivityResult` — call only with a `submitted` attempt whose `percent`/`passed`/`submitted_at` are set; it recomputes the row from **all** submitted attempts of that (user, activity) so it is safe to call from the seed and from any later backfill.

- [ ] **Step 1: Write the failing test** — `apps/api/tests/test_rollup.py`

```python
"""What this file tests: `app.attempts.rollup.upsert_activity_result` and its call from
`submit_attempt` — one row per (user, activity), best/latest/attempts/first_passed_at/
mastery semantics, and that an idempotent submit replay leaves the rollup untouched (AT-06).
Used here and why: drives the real HTTP submit flow (httpx + Postgres) so the rollup is
verified inside the same transaction as the attempt, not as a separately-called helper.
How it fits the project: FR-X-02; ADR-0004 (rollups are derived from attempts).
Works with: pytest-asyncio, httpx.
Depends on: `client`, `db`, `register`, `seed_lesson` from `conftest.py`;
`app.attempts.rollup.ActivityResult`.
Used by: CI `api` job; `make test-api`.
"""

import uuid

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.attempts.rollup import ActivityResult
from tests.conftest import register, seed_lesson


async def _run_attempt(client: AsyncClient, activity_id: str, choice: int | None) -> str:
    """Start, optionally answer the single check, submit; returns the attempt id."""
    attempt = (await client.post(f"/api/v1/activities/{activity_id}/attempts")).json()
    if choice is not None:
        await client.post(
            f"/api/v1/attempts/{attempt['id']}/items",
            json={"item_key": "lq_page2_1", "response": {"choice": choice}},
        )
    r = await client.post(
        f"/api/v1/attempts/{attempt['id']}/submit", headers={"Idempotency-Key": str(uuid.uuid4())}
    )
    assert r.status_code == 200, r.text
    return str(attempt["id"])


async def test_rollup_tracks_best_latest_and_first_pass(client: AsyncClient, db: AsyncSession) -> None:
    await seed_lesson(db)
    await register(client)
    lesson = (await client.get("/api/v1/lessons/rbe-and-oer")).json()
    aid = lesson["activity_id"]

    first = await _run_attempt(client, aid, None)  # 0 %
    row = await db.scalar(select(ActivityResult))
    assert row is not None and row.attempts == 1 and row.best_percent == 0
    assert row.latest_attempt_id == uuid.UUID(first) and row.latest_percent == 0
    assert row.mastery == "attempted" and row.first_passed_at is None

    second = await _run_attempt(client, aid, 1)  # 100 %
    await db.refresh(row)
    assert row.attempts == 2 and row.best_percent == 100 and row.latest_percent == 100
    assert row.latest_attempt_id == uuid.UUID(second)
    assert row.mastery == "passed" and row.first_passed_at is not None
    passed_at = row.first_passed_at

    third = await _run_attempt(client, aid, 0)  # back to 0 %: best stays, latest moves
    await db.refresh(row)
    assert row.attempts == 3 and row.best_percent == 100 and row.latest_percent == 0
    assert row.latest_attempt_id == uuid.UUID(third)
    assert row.mastery == "passed" and row.first_passed_at == passed_at
    assert len((await db.scalars(select(ActivityResult))).all()) == 1


async def test_replay_does_not_double_count(client: AsyncClient, db: AsyncSession) -> None:
    """AT-06: the same Idempotency-Key submitted twice yields attempts == 1."""
    await seed_lesson(db)
    await register(client)
    lesson = (await client.get("/api/v1/lessons/rbe-and-oer")).json()
    attempt = (await client.post(f"/api/v1/activities/{lesson['activity_id']}/attempts")).json()
    key = str(uuid.uuid4())
    for _ in range(2):
        r = await client.post(f"/api/v1/attempts/{attempt['id']}/submit", headers={"Idempotency-Key": key})
        assert r.status_code == 200
    row = await db.scalar(select(ActivityResult))
    assert row is not None and row.attempts == 1
```

- [ ] **Step 2: Run to verify failure**

Run: `cd apps/api && uv run pytest tests/test_rollup.py -q` → FAIL (`row is None`).

- [ ] **Step 3: Implement**

Append to `apps/api/app/attempts/rollup.py` (add `from sqlalchemy import select` / `from sqlalchemy.ext.asyncio import AsyncSession` / `from app.attempts.models import Attempt` to the imports — `Attempt` must be imported *inside* the function or after the class to avoid a circular import? No: `app.attempts.models` does not import `rollup`, so a top-level import is fine):

```python
async def upsert_activity_result(db: AsyncSession, attempt: Attempt) -> ActivityResult:
    """Recompute the (user, activity) rollup from every submitted attempt and upsert it.

    Called by `submit_attempt` inside its transaction (the attempt is already marked
    submitted but not yet committed, so it is visible to this query on the same session).
    """
    rows = (
        await db.scalars(
            select(Attempt)
            .where(
                Attempt.user_id == attempt.user_id,
                Attempt.activity_id == attempt.activity_id,
                Attempt.status == "submitted",
            )
            .order_by(Attempt.submitted_at.asc(), Attempt.id.asc())
        )
    ).all()
    result = await db.scalar(
        select(ActivityResult).where(
            ActivityResult.user_id == attempt.user_id, ActivityResult.activity_id == attempt.activity_id
        )
    )
    if result is None:
        result = ActivityResult(user_id=attempt.user_id, activity_id=attempt.activity_id)
        db.add(result)
    percents = [a.percent for a in rows if a.percent is not None]
    passed = [a for a in rows if a.passed]
    latest = rows[-1] if rows else None
    result.attempts = len(rows)
    result.best_percent = max(percents) if percents else None
    result.latest_attempt_id = latest.id if latest else None
    result.latest_percent = latest.percent if latest else None
    result.first_passed_at = passed[0].submitted_at if passed else None
    result.mastery = "passed" if passed else ("attempted" if rows else "none")
    await db.flush()
    return result
```

In `apps/api/app/attempts/router.py`, `submit_attempt`: after `attempt.duration_s = ...` and before `await db.commit()`, insert

```python
    await db.flush()  # make the submitted status visible to the rollup query
    await upsert_activity_result(db, attempt)  # FR-X-02: rollup lands in the same transaction
```

with `from app.attempts.rollup import upsert_activity_result` in the imports and the docstring's Depends list updated. The early-return replay path (`attempt.idempotency_key == idempotency_key`) is untouched, which is what keeps `attempts == 1`.

- [ ] **Step 4: Run tests, lint, types**

`cd apps/api && uv run ruff format . && uv run pytest tests/test_rollup.py tests/test_attempts.py -q && uv run ruff check . && uv run mypy app` → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/attempts tests/test_rollup.py
git commit -m "feat(api): activity_result rollup maintained on submit"
```

### Task 4: Analytics — cohort overview and student detail (audited)

**Files:**
- Create: `apps/api/app/analytics/__init__.py` (empty), `apps/api/app/analytics/schemas.py`, `apps/api/app/analytics/queries.py`, `apps/api/app/analytics/router.py`
- Modify: `apps/api/app/main.py` (mount)
- Test: `apps/api/tests/test_analytics.py`

**Interfaces:**
- Consumes: `require_cohort_educator`, `ActivityResult`, `Attempt`, `AttemptItem`, `Enrollment`, `Activity`, `Lesson`, `record_audit`, `CohortOut`/`cohort_out`.
- Produces: `GET /cohorts/{cohort_id}/overview -> CohortOverviewOut {cohort: CohortOut, activities: [ActivityRowOut], students: [StudentRowOut]}`; `GET /cohorts/{cohort_id}/students/{user_id} -> StudentDetailOut {student: MemberOut, results: [StudentResultOut], attempts: [AttemptDetailOut]}`. Schemas:

```python
class ActivityRowOut(BaseModel):
    activity_id: uuid.UUID; title: str; lesson_slug: str | None
    attempted: int; passed: int; mean_best_percent: float | None; below_threshold: bool

class StudentRowOut(BaseModel):
    user_id: uuid.UUID; display_name: str; email: str
    attempted: int; passed: int; mean_best_percent: float | None; below_threshold: bool
    last_activity_at: datetime | None

class CohortOverviewOut(BaseModel):
    cohort: CohortOut; activities: list[ActivityRowOut]; students: list[StudentRowOut]

class StudentResultOut(BaseModel):
    activity_id: uuid.UUID; title: str; lesson_slug: str | None
    best_percent: float | None; latest_percent: float | None; attempts: int
    first_passed_at: datetime | None; mastery: str; time_spent_s: int

class AttemptItemOut(BaseModel):
    item_key: str; response: dict[str, Any]; correct: bool | None; score: float | None; max_score: float | None

class AttemptDetailOut(BaseModel):
    attempt_id: uuid.UUID; activity_id: uuid.UUID; title: str; status: str
    started_at: datetime; submitted_at: datetime | None; percent: float | None; passed: bool | None
    duration_s: int | None; items: list[AttemptItemOut]

class StudentDetailOut(BaseModel):
    student: MemberOut; results: list[StudentResultOut]; attempts: list[AttemptDetailOut]
```

Semantics: `activities` = every **published** activity (all subjects), ordered by subject order then lesson order; `attempted` = students of this cohort with an `activity_result` row for it; `passed` = of those, `mastery == "passed"`; `mean_best_percent` = mean of `best_percent` over attempted students, rounded to 1 decimal, `None` when nobody attempted. `students` = every student enrollment, ordered by display name; `attempted`/`passed` count activities; `mean_best_percent` over their rollups. `below_threshold = mean_best_percent is not None and mean_best_percent < cohort.threshold_percent`. Student detail: `results` ordered like `activities` (only activities with a rollup row), `time_spent_s = sum(duration_s)` over submitted attempts; `attempts` = submitted attempts newest first with items ordered by `item_key`; a `user_id` that is not a **student enrolled in this cohort** → `404 "Student not in cohort"`. Both routes write an audit row (`read_cohort_overview` target cohort; `read_student_detail` target user, cohort set) and commit.

- [ ] **Step 1: Write the failing tests** — `apps/api/tests/test_analytics.py`

```python
"""What this file tests: `GET /cohorts/{id}/overview` and `GET /cohorts/{id}/students/{uid}`
in `app.analytics.router` — aggregates from `activity_result`, the threshold flag, cohort
scoping (a student outside the cohort is invisible), the AT-11 permission outcome (owner 200
and audited; another educator 403 and not audited), and the shape of per-attempt items.
Used here and why: builds real attempts through the HTTP flow so the numbers come from the
same rollup code the product uses; two cohorts to prove scoping.
How it fits the project: FR-E-04/05/09/10 — the educator half of the M2 vertical slice.
Works with: pytest-asyncio, httpx.
Depends on: `client`, `db`, `register`, `seed_lesson` (conftest); `make_educator`, `login`,
`create_cohort` from `tests/test_cohorts.py`; `app.audit.models.AuditLog`.
Used by: CI `api` job; `make test-api`.
"""

import uuid
from typing import Any

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.models import AuditLog
from tests.conftest import register, seed_lesson
from tests.test_cohorts import create_cohort, login, make_educator


async def _complete(client: AsyncClient, activity_id: str, choice: int | None) -> None:
    attempt = (await client.post(f"/api/v1/activities/{activity_id}/attempts")).json()
    if choice is not None:
        await client.post(
            f"/api/v1/attempts/{attempt['id']}/items",
            json={"item_key": "lq_page2_1", "response": {"choice": choice}},
        )
    r = await client.post(
        f"/api/v1/attempts/{attempt['id']}/submit", headers={"Idempotency-Key": str(uuid.uuid4())}
    )
    assert r.status_code == 200


async def _setup(client: AsyncClient, db: AsyncSession) -> dict[str, Any]:
    """Educator E owns cohort C with students A (100 %) and B (0 %); D is in another cohort."""
    await seed_lesson(db)
    aid = (await client.get("/api/v1/lessons/rbe-and-oer")).json()["activity_id"]
    await make_educator(client, db, "e@example.edu")
    cohort = await create_cohort(client, "C")
    await make_educator(client, db, "f@example.edu")
    other = await create_cohort(client, "Other")
    for email, code, choice in (
        ("a@example.edu", cohort["join_code"], 1),
        ("b@example.edu", cohort["join_code"], None),
        ("d@example.edu", other["join_code"], 1),
    ):
        await register(client, email=email, name=email[0].upper())
        assert (await client.post("/api/v1/cohorts/join", json={"code": code})).status_code == 200
        await _complete(client, aid, choice)
    await login(client, "e@example.edu")
    return {"cohort": cohort, "other": other, "aid": aid}


async def test_overview_aggregates_and_scoping(client: AsyncClient, db: AsyncSession) -> None:
    ctx = await _setup(client, db)
    r = await client.get(f"/api/v1/cohorts/{ctx['cohort']['id']}/overview")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["cohort"]["id"] == ctx["cohort"]["id"] and body["cohort"]["student_count"] == 2
    act = next(a for a in body["activities"] if a["activity_id"] == ctx["aid"])
    assert act["attempted"] == 2 and act["passed"] == 1 and act["mean_best_percent"] == 50.0
    assert act["below_threshold"] is True and act["lesson_slug"] == "rbe-and-oer"
    students = {s["email"]: s for s in body["students"]}
    assert set(students) == {"a@example.edu", "b@example.edu"}  # D is invisible
    assert students["a@example.edu"]["mean_best_percent"] == 100.0
    assert students["a@example.edu"]["below_threshold"] is False
    assert students["b@example.edu"]["mean_best_percent"] == 0.0
    assert students["b@example.edu"]["below_threshold"] is True
    assert students["a@example.edu"]["last_activity_at"] is not None
    audits = (await db.scalars(select(AuditLog).where(AuditLog.action == "read_cohort_overview"))).all()
    assert len(audits) == 1 and audits[0].cohort_id == uuid.UUID(ctx["cohort"]["id"])


async def test_overview_threshold_is_per_cohort(client: AsyncClient, db: AsyncSession) -> None:
    ctx = await _setup(client, db)
    await client.patch(f"/api/v1/cohorts/{ctx['cohort']['id']}", json={"threshold_percent": 40})
    body = (await client.get(f"/api/v1/cohorts/{ctx['cohort']['id']}/overview")).json()
    act = next(a for a in body["activities"] if a["activity_id"] == ctx["aid"])
    assert act["mean_best_percent"] == 50.0 and act["below_threshold"] is False


async def test_student_detail(client: AsyncClient, db: AsyncSession) -> None:
    ctx = await _setup(client, db)
    members = (await client.get(f"/api/v1/cohorts/{ctx['cohort']['id']}/members")).json()
    a = next(m for m in members if m["email"] == "a@example.edu")
    r = await client.get(f"/api/v1/cohorts/{ctx['cohort']['id']}/students/{a['user_id']}")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["student"]["email"] == "a@example.edu"
    assert len(body["results"]) == 1
    res = body["results"][0]
    assert res["best_percent"] == 100.0 and res["attempts"] == 1 and res["mastery"] == "passed"
    assert res["time_spent_s"] >= 0 and res["title"] == "RBE and OER"
    assert len(body["attempts"]) == 1
    att = body["attempts"][0]
    assert att["percent"] == 100.0 and att["passed"] is True and att["status"] == "submitted"
    assert att["items"] == [
        {"item_key": "lq_page2_1", "response": {"choice": 1}, "correct": True, "score": 1.0, "max_score": 1.0}
    ]
    audits = (await db.scalars(select(AuditLog).where(AuditLog.action == "read_student_detail"))).all()
    assert len(audits) == 1 and audits[0].target_id == uuid.UUID(a["user_id"])


async def test_student_outside_cohort_is_404(client: AsyncClient, db: AsyncSession) -> None:
    ctx = await _setup(client, db)
    await login(client, "f@example.edu")
    d = (await client.get(f"/api/v1/cohorts/{ctx['other']['id']}/members")).json()[0]
    await login(client, "e@example.edu")
    r = await client.get(f"/api/v1/cohorts/{ctx['cohort']['id']}/students/{d['user_id']}")
    assert r.status_code == 404


async def test_other_educator_403_and_not_audited(client: AsyncClient, db: AsyncSession) -> None:
    """AT-11: F requests E's cohort views → 403; no audit rows for F."""
    ctx = await _setup(client, db)
    members = (await client.get(f"/api/v1/cohorts/{ctx['cohort']['id']}/members")).json()
    await login(client, "f@example.edu")
    assert (await client.get(f"/api/v1/cohorts/{ctx['cohort']['id']}/overview")).status_code == 403
    r = await client.get(f"/api/v1/cohorts/{ctx['cohort']['id']}/students/{members[0]['user_id']}")
    assert r.status_code == 403
    await login(client, "a@example.edu")
    assert (await client.get(f"/api/v1/cohorts/{ctx['cohort']['id']}/overview")).status_code == 403
    reads = (await db.scalars(select(AuditLog).where(AuditLog.action.in_(["read_cohort_overview", "read_student_detail"])))).all()
    assert reads == []
```

- [ ] **Step 2: Run to verify failure** — `cd apps/api && uv run pytest tests/test_analytics.py -q` → FAIL (404, router missing).

- [ ] **Step 3: Implement `queries.py`** (pure query functions returning Pydantic rows so the router stays thin):

```python
"""Aggregation queries behind the educator views (`app.analytics.router`).

What this file does: `activity_rows(db, cohort)` and `student_rows(db, cohort)` build the
overview tables from `activity_result` joined through `enrollment` (so only this cohort's
students count); `student_results(db, cohort, user)` and `student_attempts(db, user)` build
the per-student detail.
Used here and why: SQL aggregates (`count`, `avg`) over the rollup rather than in Python so
a 50-student × 100-activity cohort is one query per table (NFR-01); `_mean` rounds to one
decimal in Python so the JSON is stable across Postgres versions.
How it fits the project: FR-E-04/05; every function takes the already-authorised `Cohort`.
Depends on: `app.attempts.models`, `app.attempts.rollup.ActivityResult`, `app.auth.models`,
`app.cohorts.models.Enrollment`, `app.content.models`, `app.analytics.schemas`.
Used by: `app.analytics.router`.
"""
```

Then the functions (the reviewer will check these against the semantics above):

```python
def _mean(values: list[float]) -> float | None:
    return round(sum(values) / len(values), 1) if values else None


def _published_activities() -> Select[Any]:
    return (
        select(Activity, Lesson.slug)
        .join(Subject, Subject.id == Activity.subject_id)
        .outerjoin(Lesson, Lesson.id == Activity.lesson_id)
        .where(Activity.status == "published")
        .order_by(Subject.order, Lesson.order, Activity.title)
    )


def _cohort_students(cohort_id: uuid.UUID) -> Select[Any]:
    return select(Enrollment.user_id).where(
        Enrollment.cohort_id == cohort_id, Enrollment.role == "student"
    )


async def activity_rows(db: AsyncSession, cohort: Cohort) -> list[ActivityRowOut]:
    activities = (await db.execute(_published_activities())).all()
    rollups = (
        await db.scalars(
            select(ActivityResult).where(ActivityResult.user_id.in_(_cohort_students(cohort.id)))
        )
    ).all()
    by_activity: dict[uuid.UUID, list[ActivityResult]] = defaultdict(list)
    for r in rollups:
        by_activity[r.activity_id].append(r)
    rows = []
    for activity, slug in activities:
        rs = by_activity.get(activity.id, [])
        mean = _mean([r.best_percent for r in rs if r.best_percent is not None])
        rows.append(
            ActivityRowOut(
                activity_id=activity.id, title=activity.title, lesson_slug=slug,
                attempted=len(rs), passed=sum(1 for r in rs if r.mastery == "passed"),
                mean_best_percent=mean,
                below_threshold=mean is not None and mean < cohort.threshold_percent,
            )
        )
    return rows


async def student_rows(db: AsyncSession, cohort: Cohort) -> list[StudentRowOut]:
    members = (
        await db.execute(
            select(User)
            .join(Enrollment, Enrollment.user_id == User.id)
            .where(Enrollment.cohort_id == cohort.id, Enrollment.role == "student")
            .order_by(User.display_name)
        )
    ).scalars().all()
    rollups = (
        await db.scalars(
            select(ActivityResult).where(ActivityResult.user_id.in_(_cohort_students(cohort.id)))
        )
    ).all()
    last_rows = await db.execute(
        select(Attempt.user_id, func.max(Attempt.submitted_at))
        .where(Attempt.user_id.in_(_cohort_students(cohort.id)), Attempt.status == "submitted")
        .group_by(Attempt.user_id)
    )
    last: dict[uuid.UUID, datetime | None] = {uid: at for uid, at in last_rows.all()}
    by_user: dict[uuid.UUID, list[ActivityResult]] = defaultdict(list)
    for r in rollups:
        by_user[r.user_id].append(r)
    rows = []
    for u in members:
        rs = by_user.get(u.id, [])
        mean = _mean([r.best_percent for r in rs if r.best_percent is not None])
        rows.append(
            StudentRowOut(
                user_id=u.id, display_name=u.display_name, email=u.email,
                attempted=len(rs), passed=sum(1 for r in rs if r.mastery == "passed"),
                mean_best_percent=mean,
                below_threshold=mean is not None and mean < cohort.threshold_percent,
                last_activity_at=last.get(u.id),
            )
        )
    return rows


async def student_results(db: AsyncSession, user_id: uuid.UUID) -> list[StudentResultOut]:
    spent_rows = await db.execute(
        select(Attempt.activity_id, func.coalesce(func.sum(Attempt.duration_s), 0))
        .where(Attempt.user_id == user_id, Attempt.status == "submitted")
        .group_by(Attempt.activity_id)
    )
    time_spent: dict[uuid.UUID, int] = {aid: int(total) for aid, total in spent_rows.all()}
    rows = await db.execute(
        select(ActivityResult, Activity.title, Lesson.slug)
        .join(Activity, Activity.id == ActivityResult.activity_id)
        .join(Subject, Subject.id == Activity.subject_id)
        .outerjoin(Lesson, Lesson.id == Activity.lesson_id)
        .where(ActivityResult.user_id == user_id)
        .order_by(Subject.order, Lesson.order, Activity.title)
    )
    return [
        StudentResultOut(
            activity_id=r.activity_id, title=title, lesson_slug=slug,
            best_percent=r.best_percent, latest_percent=r.latest_percent, attempts=r.attempts,
            first_passed_at=r.first_passed_at, mastery=r.mastery,
            time_spent_s=int(time_spent.get(r.activity_id, 0)),
        )
        for r, title, slug in rows.all()
    ]


async def student_attempts(db: AsyncSession, user_id: uuid.UUID) -> list[AttemptDetailOut]:
    rows = await db.execute(
        select(Attempt, Activity.title)
        .join(Activity, Activity.id == Attempt.activity_id)
        .where(Attempt.user_id == user_id, Attempt.status == "submitted")
        .order_by(Attempt.submitted_at.desc())
        .limit(200)
    )
    return [
        AttemptDetailOut(
            attempt_id=a.id, activity_id=a.activity_id, title=title, status=a.status,
            started_at=a.started_at, submitted_at=a.submitted_at, percent=a.percent, passed=a.passed,
            duration_s=a.duration_s,
            items=[
                AttemptItemOut(item_key=i.item_key, response=i.response, correct=i.correct,
                               score=i.score, max_score=i.max_score)
                for i in sorted(a.items, key=lambda i: i.item_key)
            ],
        )
        for a, title in rows.all()
    ]
```

(`Attempt.items` is `lazy="selectin"`, so the items load in one extra query.)

- [ ] **Step 4: Router**

```python
router = APIRouter(prefix="/cohorts", tags=["analytics"])


@router.get("/{cohort_id}/overview", response_model=CohortOverviewOut)
async def cohort_overview(
    request: Request,
    cohort: Cohort = Depends(require_cohort_educator),
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_session),
) -> CohortOverviewOut:
    out = CohortOverviewOut(
        cohort=await cohort_out(db, cohort, "educator"),
        activities=await activity_rows(db, cohort),
        students=await student_rows(db, cohort),
    )
    await record_audit(
        db, actor=user, action="read_cohort_overview", target_type="cohort", target_id=cohort.id,
        cohort_id=cohort.id, request=request, detail={"students": len(out.students)},
    )
    await db.commit()
    return out


@router.get("/{cohort_id}/students/{user_id}", response_model=StudentDetailOut)
async def student_detail(
    user_id: uuid.UUID,
    request: Request,
    cohort: Cohort = Depends(require_cohort_educator),
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_session),
) -> StudentDetailOut:
    row = (
        await db.execute(
            select(User, Enrollment)
            .join(Enrollment, Enrollment.user_id == User.id)
            .where(Enrollment.cohort_id == cohort.id, Enrollment.user_id == user_id, Enrollment.role == "student")
        )
    ).first()
    if row is None:
        raise Problem(404, "Student not in cohort")
    student, enrollment = row
    attempts = await student_attempts(db, student.id)
    out = StudentDetailOut(
        student=MemberOut(
            user_id=student.id, display_name=student.display_name, email=student.email,
            role=enrollment.role, joined_at=enrollment.joined_at,
            last_activity_at=attempts[0].submitted_at if attempts else None,
        ),
        results=await student_results(db, student.id),
        attempts=attempts,
    )
    await record_audit(
        db, actor=user, action="read_student_detail", target_type="user", target_id=student.id,
        cohort_id=cohort.id, request=request,
    )
    await db.commit()
    return out
```

`cohort_out` is imported from `app.cohorts.router`. Mount in `app/main.py` **after** `cohorts_router`.

- [ ] **Step 5: Run tests, lint, types** — `cd apps/api && uv run ruff format . && uv run pytest tests/test_analytics.py tests/test_cohorts.py -q && uv run ruff check . && uv run mypy app` → PASS; then `uv run pytest -q`.

- [ ] **Step 6: Commit**

```bash
git add apps/api/app/analytics apps/api/app/cohorts/router.py apps/api/app/main.py apps/api/tests/test_analytics.py
git commit -m "feat(api): audited cohort overview and student detail"
```

### Task 5: Admin API — users, role change, deactivate, audit log

**Files:**
- Create: `apps/api/app/admin/__init__.py` (empty), `apps/api/app/admin/schemas.py`, `apps/api/app/admin/router.py`
- Modify: `apps/api/app/main.py` (mount)
- Test: `apps/api/tests/test_admin.py`

**Interfaces:**
- Produces (all `require_role(UserRole.admin)`, prefix `/admin`): `GET /users?q=&limit=50&cursor=` → `UserPage {items: [AdminUserOut], next_cursor: str | null}` where `AdminUserOut {id, email, display_name, role, deactivated_at, created_at}` ordered by `created_at desc, id desc`, `q` matches email/display_name case-insensitively (`ILIKE %q%`), cursor = the last item's `id` (UUIDv7 sorts by time, so `id < cursor` is the page boundary); `PATCH /users/{id}/role {role}` → `AdminUserOut` (audited `change_role`, detail `{from, to}`; changing your own role → 400); `POST /users/{id}/deactivate` → `AdminUserOut` (sets `deactivated_at`, revokes all sessions via `revoke_all_for_user`, audited `deactivate_user`; deactivating yourself → 400); `GET /audit-log?actor_id=&action=&target_id=&since=&until=&limit=100` → `list[AuditOut] {id, actor_id, actor_email, action, target_type, target_id, cohort_id, request_id, ip, at, detail}` newest first.

- [ ] **Step 1: Write the failing tests** — `apps/api/tests/test_admin.py`

```python
"""What this file tests: `app.admin.router` — admin-only access, user search and cursor
pagination, audited role change (effective on the user's next request), audited
deactivation (session refused afterwards), and the audit-log listing with filters.
Used here and why: httpx + real Postgres; the deactivated user's own client is reused to
prove their existing session stops working (FR-M-01/02 "takes effect on next request").
How it fits the project: FR-M-01/02/04; the admin surface the owner needs to promote the
mentor to educator on the test VM without psql.
Works with: pytest-asyncio, httpx.
Depends on: `client`, `db`, `register` (conftest); `promote`, `login` from `test_cohorts.py`.
Used by: CI `api` job; `make test-api`.
"""

import uuid

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import UserRole
from tests.conftest import register
from tests.test_cohorts import login, promote


async def make_admin(client: AsyncClient, db: AsyncSession, email: str = "root@example.edu") -> None:
    await register(client, email=email, name="Root")
    await promote(db, email, UserRole.admin)


async def test_non_admin_forbidden(client: AsyncClient, db: AsyncSession) -> None:
    await register(client)
    assert (await client.get("/api/v1/admin/users")).status_code == 403
    await promote(db, "a@example.edu", UserRole.educator)
    assert (await client.get("/api/v1/admin/audit-log")).status_code == 403


async def test_list_search_paginate(client: AsyncClient, db: AsyncSession) -> None:
    for i in range(3):
        await register(client, email=f"s{i}@example.edu", name=f"Student {i}")
    await make_admin(client, db)
    page = (await client.get("/api/v1/admin/users", params={"limit": 2})).json()
    assert len(page["items"]) == 2 and page["next_cursor"]
    assert page["items"][0]["email"] == "root@example.edu"  # newest first
    rest = (await client.get("/api/v1/admin/users", params={"limit": 2, "cursor": page["next_cursor"]})).json()
    assert len(rest["items"]) == 2 and rest["next_cursor"] is None
    ids = [u["id"] for u in page["items"] + rest["items"]]
    assert len(set(ids)) == 4
    found = (await client.get("/api/v1/admin/users", params={"q": "STUDENT 1"})).json()["items"]
    assert [u["email"] for u in found] == ["s1@example.edu"]


async def test_role_change_is_audited_and_effective(client: AsyncClient, db: AsyncSession) -> None:
    await register(client, email="m@example.edu", name="Mentor")
    assert (await client.post("/api/v1/cohorts", json={"name": "X"})).status_code == 403
    await make_admin(client, db)
    admin_id = (await client.get("/api/v1/auth/me")).json()["id"]
    mentor = (await client.get("/api/v1/admin/users", params={"q": "m@example.edu"})).json()["items"][0]
    r = await client.patch(f"/api/v1/admin/users/{mentor['id']}/role", json={"role": "educator"})
    assert r.status_code == 200 and r.json()["role"] == "educator"
    assert (await client.patch(f"/api/v1/admin/users/{admin_id}/role", json={"role": "student"})).status_code == 400
    assert (await client.patch(f"/api/v1/admin/users/{uuid.uuid4()}/role", json={"role": "student"})).status_code == 404
    assert (await client.patch(f"/api/v1/admin/users/{mentor['id']}/role", json={"role": "owner"})).status_code == 422
    log = (await client.get("/api/v1/admin/audit-log", params={"action": "change_role"})).json()
    assert len(log) == 1 and log[0]["target_id"] == mentor["id"] and log[0]["actor_email"] == "root@example.edu"
    assert log[0]["detail"] == {"from": "student", "to": "educator"}
    # The role is read from the user row on every request, so it applies to the next call.
    await login(client, "m@example.edu")
    assert (await client.post("/api/v1/cohorts", json={"name": "X"})).status_code == 201


async def test_deactivate_revokes_sessions(client: AsyncClient, db: AsyncSession) -> None:
    await register(client, email="gone@example.edu", name="Gone")
    await make_admin(client, db)
    admin_id = (await client.get("/api/v1/auth/me")).json()["id"]
    gone = (await client.get("/api/v1/admin/users", params={"q": "gone@"})).json()["items"][0]
    r = await client.post(f"/api/v1/admin/users/{gone['id']}/deactivate")
    assert r.status_code == 200 and r.json()["deactivated_at"]
    assert (await client.post(f"/api/v1/admin/users/{admin_id}/deactivate")).status_code == 400
    r = await client.post("/api/v1/auth/login", json={"email": "gone@example.edu", "password": "password-123"})
    assert r.status_code == 401
    log = (await client.get("/api/v1/admin/audit-log", params={"action": "deactivate_user"})).json()
    assert len(log) == 1


async def test_audit_log_filters(client: AsyncClient, db: AsyncSession) -> None:
    await register(client, email="m@example.edu", name="M")
    await make_admin(client, db)
    m = (await client.get("/api/v1/admin/users", params={"q": "m@"})).json()["items"][0]
    await client.patch(f"/api/v1/admin/users/{m['id']}/role", json={"role": "educator"})
    await client.patch(f"/api/v1/admin/users/{m['id']}/role", json={"role": "student"})
    all_rows = (await client.get("/api/v1/admin/audit-log")).json()
    assert len(all_rows) == 2 and all_rows[0]["at"] >= all_rows[1]["at"]
    assert len((await client.get("/api/v1/admin/audit-log", params={"target_id": m["id"]})).json()) == 2
    assert (await client.get("/api/v1/admin/audit-log", params={"since": "2099-01-01T00:00:00Z"})).json() == []
    assert (await client.get("/api/v1/admin/audit-log", params={"limit": 1})).json()[0]["detail"]["to"] == "student"
```

- [ ] **Step 2: Run to verify failure** — `cd apps/api && uv run pytest tests/test_admin.py -q` → FAIL.

- [ ] **Step 3: Schemas and router**

`apps/api/app/admin/schemas.py`:

```python
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.auth.models import UserRole


class AdminUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: str
    display_name: str
    role: UserRole
    deactivated_at: datetime | None
    created_at: datetime


class UserPage(BaseModel):
    items: list[AdminUserOut]
    next_cursor: str | None


class RoleIn(BaseModel):
    role: UserRole


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
```

`apps/api/app/admin/router.py` (header comment per the global constraint; imports as needed):

```python
router = APIRouter(
    prefix="/admin", tags=["admin"], dependencies=[Depends(require_role(UserRole.admin))]
)


@router.get("/users", response_model=UserPage)
async def list_users(
    q: str | None = Query(default=None, max_length=120),
    limit: int = Query(default=50, ge=1, le=200),
    cursor: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_session),
) -> UserPage:
    stmt = select(User).order_by(User.id.desc()).limit(limit + 1)  # UUIDv7 = creation order
    if q:
        pattern = f"%{q.strip()}%"
        stmt = stmt.where(or_(User.email.ilike(pattern), User.display_name.ilike(pattern)))
    if cursor:
        stmt = stmt.where(User.id < cursor)  # UUIDv7 ids are time-ordered
    users = (await db.scalars(stmt)).all()
    items = [AdminUserOut.model_validate(u) for u in users[:limit]]
    next_cursor = str(items[-1].id) if len(users) > limit else None
    return UserPage(items=items, next_cursor=next_cursor)


async def _target(db: AsyncSession, user_id: uuid.UUID, actor: User) -> User:
    target = await db.get(User, user_id)
    if target is None:
        raise Problem(404, "User not found")
    if target.id == actor.id:
        raise Problem(400, "You cannot change your own account here")
    return target


@router.patch("/users/{user_id}/role", response_model=AdminUserOut)
async def change_role(
    user_id: uuid.UUID, body: RoleIn, request: Request,
    actor: User = Depends(require_user), db: AsyncSession = Depends(get_session),
) -> User:
    target = await _target(db, user_id, actor)
    previous = target.role
    target.role = body.role
    await record_audit(
        db, actor=actor, action="change_role", target_type="user", target_id=target.id,
        request=request, detail={"from": previous.value, "to": body.role.value},
    )
    await db.commit()
    return target


@router.post("/users/{user_id}/deactivate", response_model=AdminUserOut)
async def deactivate_user(
    user_id: uuid.UUID, request: Request,
    actor: User = Depends(require_user), db: AsyncSession = Depends(get_session),
) -> User:
    target = await _target(db, user_id, actor)
    if target.deactivated_at is None:
        target.deactivated_at = datetime.now(UTC)
    revoked = await revoke_all_for_user(db, target.id)
    await record_audit(
        db, actor=actor, action="deactivate_user", target_type="user", target_id=target.id,
        request=request, detail={"sessions_revoked": revoked},
    )
    await db.commit()
    return target


@router.get("/audit-log", response_model=list[AuditOut])
async def audit_log(
    actor_id: uuid.UUID | None = None,
    action: str | None = Query(default=None, max_length=60),
    target_id: uuid.UUID | None = None,
    since: datetime | None = None,
    until: datetime | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    db: AsyncSession = Depends(get_session),
) -> list[AuditOut]:
    stmt = (
        select(AuditLog, User.email)
        .outerjoin(User, User.id == AuditLog.actor_id)
        .order_by(AuditLog.at.desc(), AuditLog.id.desc())
        .limit(limit)
    )
    if actor_id:
        stmt = stmt.where(AuditLog.actor_id == actor_id)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if target_id:
        stmt = stmt.where(AuditLog.target_id == target_id)
    if since:
        stmt = stmt.where(AuditLog.at >= since)
    if until:
        stmt = stmt.where(AuditLog.at <= until)
    return [
        AuditOut(
            id=row.id, actor_id=row.actor_id, actor_email=email, action=row.action,
            target_type=row.target_type, target_id=row.target_id, cohort_id=row.cohort_id,
            request_id=row.request_id, ip=row.ip, at=row.at, detail=row.detail,
        )
        for row, email in (await db.execute(stmt)).all()
    ]
```

`app.auth.sessions.resolve_session` already refuses sessions of deactivated users (line ~72), so revoking sessions is belt-and-braces. Mount `admin_router` in `app/main.py`.

- [ ] **Step 4: Run tests, lint, types** — `cd apps/api && uv run ruff format . && uv run pytest tests/test_admin.py -q && uv run ruff check . && uv run mypy app` → PASS; `uv run pytest -q` all green.

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/admin apps/api/app/main.py apps/api/app/auth apps/api/tests/test_admin.py
git commit -m "feat(api): admin users, audited role change and deactivation, audit-log view"
```

### Task 6: Seed — demo cohort, ten students with attempts and rollups

**Files:**
- Modify: `apps/api/app/seed.py`, `apps/api/tests/test_seed.py`

**Interfaces:**
- `SeedSummary` gains `students_created: int`, `attempts_created: int`, `cohort_created: bool`. Constants: `SEED_COHORT_NAME = "Demo cohort"`, `SEED_JOIN_CODE = "DEMO42"`, `SEED_STUDENT_COUNT = 10`, `SEED_LESSON_SLUG = "rbe-and-oer"` (the lesson's two knowledge checks are `lq_page2_1` and `lq_page5_1`; the seed sorts the snapshot's checks by key rather than hard-coding them).

- [ ] **Step 1: Extend the tests** — in `apps/api/tests/test_seed.py` update `test_seed_is_idempotent` (`users_created == 13`, second run `0`, total users 13) and add:

```python
async def test_seed_cohort_students_and_results(db: AsyncSession, settings: Settings) -> None:
    """One demo cohort with the educator and ten students; each student has one submitted
    attempt on rbe-and-oer scoring index % 3 out of 2, and a rollup row; re-seeding adds none."""
    first = await seed(db, settings)
    assert first.cohort_created and first.students_created == 10 and first.attempts_created == 10
    cohort = await db.scalar(select(Cohort).where(Cohort.join_code == "DEMO42"))
    assert cohort is not None and cohort.name == "Demo cohort" and cohort.threshold_percent == 70
    roles = (await db.execute(select(Enrollment.role, func.count()).where(Enrollment.cohort_id == cohort.id).group_by(Enrollment.role))).all()
    assert dict(roles) == {"educator": 1, "student": 10}
    percents = sorted((await db.scalars(select(ActivityResult.best_percent))).all())
    assert percents == [0.0, 0.0, 0.0, 50.0, 50.0, 50.0, 50.0, 100.0, 100.0, 100.0]
    second = await seed(db, settings)
    assert not second.cohort_created and second.students_created == 0 and second.attempts_created == 0
    assert (await db.scalar(select(func.count()).select_from(Attempt))) == 10
```

and a login check for `student03@example.com` in `test_seed_users_can_log_in`.

- [ ] **Step 2: Run to verify failure** — `cd apps/api && uv run pytest tests/test_seed.py -q` → FAIL.

- [ ] **Step 3: Implement** — in `app/seed.py` after the lesson import loop:

```python
    # --- Demo cohort: the educator owns it; ten students are enrolled with one attempt each ---
    educator = await db.scalar(select(User).where(User.email == "educator@example.com"))
    assert educator is not None
    cohort = await db.scalar(select(Cohort).where(Cohort.join_code == SEED_JOIN_CODE))
    cohort_created = cohort is None
    if cohort is None:
        cohort = Cohort(name=SEED_COHORT_NAME, join_code=SEED_JOIN_CODE, created_by=educator.id)
        db.add(cohort)
        await db.flush()
        db.add(Enrollment(user_id=educator.id, cohort_id=cohort.id, role="educator"))

    lesson = await db.scalar(select(Lesson).where(Lesson.slug == SEED_LESSON_SLUG))
    activity = await db.scalar(select(Activity).where(Activity.lesson_id == lesson.id)) if lesson else None
    assert activity is not None and activity.current_version_id is not None
    version = await db.get(ContentVersion, activity.current_version_id)
    assert version is not None
    checks = knowledge_checks(version.snapshot)

    students_created = attempts_created = 0
    for i in range(1, SEED_STUDENT_COUNT + 1):
        email = f"student{i:02d}@example.com"
        student = await db.scalar(select(User).where(User.email == email))
        if student is None:
            student = User(email=email, display_name=f"Student {i:02d}", role=UserRole.student, password_hash=password_hash)
            db.add(student)
            await db.flush()
            students_created += 1
        enrolled = await db.scalar(select(Enrollment.id).where(Enrollment.user_id == student.id, Enrollment.cohort_id == cohort.id))
        if enrolled is None:
            db.add(Enrollment(user_id=student.id, cohort_id=cohort.id, role="student"))
        has_attempt = await db.scalar(select(Attempt.id).where(Attempt.user_id == student.id, Attempt.activity_id == activity.id))
        if has_attempt is not None:
            continue
        correct = i % 3  # 1, 2, 0, 1, 2, 0, ... correct answers out of 2
        attempt = Attempt(
            user_id=student.id, activity_id=activity.id, content_version_id=version.id,
            status="submitted", idempotency_key=f"seed-{email}",
        )
        db.add(attempt)
        await db.flush()
        for n, (key, block) in enumerate(sorted(checks.items())):
            answer = int(block["body"]["answer"])
            choice = answer if n < correct else (answer + 1) % len(block["body"]["options"])
            graded = grade_single_choice(block["body"], {"choice": choice})
            db.add(AttemptItem(attempt_id=attempt.id, item_key=key, response={"choice": choice},
                               correct=graded.correct, score=graded.score, max_score=graded.max_score,
                               graded_at=datetime.now(UTC)))
        max_score = float(len(checks))
        attempt.score = float(correct)
        attempt.max_score = max_score
        attempt.percent = round(100.0 * correct / max_score, 2)
        attempt.passed = attempt.percent >= 80
        attempt.submitted_at = datetime.now(UTC)
        attempt.duration_s = 300 + 30 * i
        await db.flush()
        await upsert_activity_result(db, attempt)
        attempts_created += 1

    return SeedSummary(users_created=users_created + students_created, lessons_imported=lessons_imported,
                       students_created=students_created, attempts_created=attempts_created,
                       cohort_created=cohort_created)
```

Note `users_created` in the summary counts all 13 (three demo accounts + ten students) so the existing idempotency test's `second.users_created == 0` still holds; update the `print` in `_run` to include cohort/students/attempts.

- [ ] **Step 4: Run tests, lint, types** — `cd apps/api && uv run ruff format . && uv run pytest tests/test_seed.py -q && uv run ruff check . && uv run mypy app` → PASS; `uv run pytest -q`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/seed.py apps/api/tests/test_seed.py
git commit -m "feat(api): seed a demo cohort with ten students, attempts and rollups"
```

### Task 7: Generated client, request-id forwarding, educator pages

**Files:**
- Regenerate: `packages/api-client/openapi.json`, `packages/api-client/src/schema.d.ts` (`make client`)
- Modify: `apps/web/src/lib/server/api.ts` (forward `X-Request-Id`; add `apiJson`), `apps/web/src/lib/server/api.test.ts` (+2 tests), `apps/web/src/routes/(app)/+layout.svelte` (nav links by role)
- Create: `apps/web/src/lib/cohort/format.ts`, `apps/web/src/lib/cohort/format.test.ts`, `apps/web/src/routes/(app)/educator/+page.server.ts`, `+page.svelte`, `apps/web/src/routes/(app)/educator/cohorts/[id]/+page.server.ts`, `+page.svelte`, `apps/web/src/routes/(app)/educator/cohorts/[id]/students/[uid]/+page.server.ts`, `+page.svelte`

**Interfaces:**
- Produces: `apiJson(event, path, body?, method = 'POST')` = `apiFetch(event, path, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })`; `formatPercent(p: number | null | undefined): string` (`'—'` for null, else `${p.toFixed(1)}%`... **exactly**: `50` → `"50.0%"`, `100` → `"100.0%"`, `null` → `"—"`); `belowThresholdClass(flag: boolean): string` (`'below'` or `''`). Types come from `components['schemas'][...]` of the regenerated client: `CohortOut`, `MemberOut`, `CohortOverviewOut`, `StudentDetailOut`.

- [ ] **Step 1: Regenerate the client** — from the repo root: `make client`; confirm `git diff --stat packages/api-client` shows the new schemas (`CohortOut`, `CohortOverviewOut`, `StudentDetailOut`, `AdminUserOut`, …). Commit separately: `git add packages/api-client && git commit -m "chore(client): regenerate for cohorts, analytics and admin routes"`.

- [ ] **Step 2: Failing web unit tests**

Append to `apps/web/src/lib/server/api.test.ts` (follow the file's existing mock-event pattern):

```ts
it('forwards the request id on every call and JSON-encodes apiJson bodies', async () => {
	const calls: { url: string; init: RequestInit }[] = [];
	const event = makeEvent({ fetch: async (url: string, init: RequestInit) => { calls.push({ url, init }); return new Response('{}'); } });
	event.locals.requestId = 'rid-1';
	await apiJson(event, '/cohorts', { name: 'X' });
	const h = new Headers(calls[0].init.headers);
	expect(h.get('x-request-id')).toBe('rid-1');
	expect(h.get('content-type')).toBe('application/json');
	expect(h.get('origin')).toBe('http://localhost:8080');
	expect(calls[0].init.method).toBe('POST');
	expect(calls[0].init.body).toBe('{"name":"X"}');
});
```

`apps/web/src/lib/cohort/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { belowThresholdClass, formatPercent } from './format';

describe('formatPercent', () => {
	it('renders one decimal or a dash', () => {
		expect(formatPercent(50)).toBe('50.0%');
		expect(formatPercent(100)).toBe('100.0%');
		expect(formatPercent(33.333)).toBe('33.3%');
		expect(formatPercent(null)).toBe('—');
		expect(formatPercent(undefined)).toBe('—');
	});
});

describe('belowThresholdClass', () => {
	it('maps the flag to a css class', () => {
		expect(belowThresholdClass(true)).toBe('below');
		expect(belowThresholdClass(false)).toBe('');
	});
});
```

Run `pnpm --filter web test` → the new tests FAIL.

- [ ] **Step 3: Implement `api.ts` changes and `format.ts`**

In `apiFetch` (event branch) add `h.set('x-request-id', event.locals.requestId);` next to the cookie forwarding, and export:

```ts
/** JSON request helper for form actions: sets content-type, encodes the body, forwards cookie/origin/request id. */
export function apiJson(
	event: RequestEvent,
	path: string,
	body?: unknown,
	method: 'POST' | 'PATCH' | 'DELETE' = 'POST'
): Promise<Response> {
	return apiFetch(event, path, {
		method,
		headers: { 'content-type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body)
	});
}
```

`apps/web/src/lib/cohort/format.ts`:

```ts
export function formatPercent(p: number | null | undefined): string {
	return p === null || p === undefined ? '—' : `${p.toFixed(1)}%`;
}

export function belowThresholdClass(flag: boolean): string {
	return flag ? 'below' : '';
}
```

- [ ] **Step 4: Educator list + create** — `apps/web/src/routes/(app)/educator/+page.server.ts`:

```ts
import { fail, redirect } from '@sveltejs/kit';
import { apiFetch, apiJson } from '$lib/server/api';
import { problemMessage } from '$lib/server/auth-forms';
import type { components } from '@rtapps/api-client';
import type { Actions, PageServerLoad } from './$types';

type CohortOut = components['schemas']['CohortOut'];

export const load: PageServerLoad = async (event) => {
	const res = await apiFetch(event, '/cohorts');
	if (!res.ok) return { cohorts: [] as CohortOut[], error: 'Could not load cohorts' };
	const cohorts: CohortOut[] = await res.json();
	return { cohorts: cohorts.filter((c) => c.role === 'educator'), error: undefined };
};

export const actions: Actions = {
	create: async (event) => {
		const form = await event.request.formData();
		const name = String(form.get('name') ?? '').trim();
		const res = await apiJson(event, '/cohorts', { name });
		if (!res.ok) {
			const problem = await res.json().catch(() => undefined);
			return fail(res.status, { error: problemMessage(problem, res.status), name });
		}
		const cohort: CohortOut = await res.json();
		redirect(303, `/educator/cohorts/${cohort.id}`);
	}
};
```

`+page.svelte`: heading "My cohorts"; a `<form method="POST" action="?/create" use:enhance>` with `<label for="name">Cohort name</label><input id="name" name="name" required value={form?.name ?? ''}>` and `<button>Create cohort</button>`; `{#if form?.error}<p role="alert">{form.error}</p>{/if}`; a table (Name · Students · Join code) with each name a link `href={resolve('/educator/cohorts/[id]', { id: c.id })}`; empty state "No cohorts yet — create one above."

- [ ] **Step 5: Cohort overview** — `apps/web/src/routes/(app)/educator/cohorts/[id]/+page.server.ts`:

```ts
import { error, fail } from '@sveltejs/kit';
import { apiFetch, apiJson } from '$lib/server/api';
import { problemMessage } from '$lib/server/auth-forms';
import type { components } from '@rtapps/api-client';
import type { Actions, PageServerLoad } from './$types';

type CohortOverviewOut = components['schemas']['CohortOverviewOut'];
type MemberOut = components['schemas']['MemberOut'];

export const load: PageServerLoad = async (event) => {
	const [overviewRes, membersRes] = await Promise.all([
		apiFetch(event, `/cohorts/${event.params.id}/overview`),
		apiFetch(event, `/cohorts/${event.params.id}/members`)
	]);
	if (overviewRes.status === 404) error(404, 'Cohort not found');
	if (overviewRes.status === 403) error(403, 'You are not an educator of this cohort');
	if (!overviewRes.ok || !membersRes.ok) error(502, 'Could not load the cohort');
	const overview: CohortOverviewOut = await overviewRes.json();
	const members: MemberOut[] = await membersRes.json();
	return { overview, members };
};

async function problemOrNull(res: Response) {
	const problem = await res.json().catch(() => undefined);
	return fail(res.status, { error: problemMessage(problem, res.status) });
}

export const actions: Actions = {
	rotate: async (event) => {
		const res = await apiJson(event, `/cohorts/${event.params.id}/rotate-code`);
		return res.ok ? { rotated: true } : problemOrNull(res);
	},
	threshold: async (event) => {
		const form = await event.request.formData();
		const threshold_percent = Number(form.get('threshold_percent'));
		const res = await apiJson(event, `/cohorts/${event.params.id}`, { threshold_percent }, 'PATCH');
		return res.ok ? { saved: true } : problemOrNull(res);
	},
	remove: async (event) => {
		const form = await event.request.formData();
		const uid = String(form.get('user_id') ?? '');
		const res = await apiJson(event, `/cohorts/${event.params.id}/members/${uid}`, undefined, 'DELETE');
		return res.ok ? { removed: true } : problemOrNull(res);
	}
};
```

`+page.svelte` renders, in order: `<h1>{overview.cohort.name}</h1>`; a "Join code" panel — `<p>Join code: <code data-testid="join-code">{overview.cohort.join_code}</code></p>` and `<form method="POST" action="?/rotate" use:enhance><button>Rotate code</button></form>`; a threshold form (`<label for="threshold_percent">Below-threshold mark (%)</label><input id="threshold_percent" name="threshold_percent" type="number" min="0" max="100" value={overview.cohort.threshold_percent}><button>Save</button>`); `<h2>Activities</h2>` table (Activity · Attempted · Passed · Mean best) with `class={belowThresholdClass(a.below_threshold)}` on the row and `formatPercent(a.mean_best_percent)`; `<h2>Students</h2>` table (Student · Email · Attempted · Passed · Mean best · Last activity · action) where the student name links to `resolve('/educator/cohorts/[id]/students/[uid]', { id, uid: s.user_id })`, the row gets the `below` class, and the last cell is `<form method="POST" action="?/remove" use:enhance><input type="hidden" name="user_id" value={s.user_id}><button>Remove</button></form>`; `{#if form?.error}<p role="alert">{form.error}</p>{/if}`. A `<style>` block: `tr.below { background: #fff3f3; }`.

Note: `members` is used only for `joined_at` (merge by `user_id` into the students table: `members.find(m => m.user_id === s.user_id)?.joined_at`). If that makes the template awkward, drop the members fetch and the Joined column — the reviewer accepts either; the roster columns FR-E-03 requires are name, email, joined date, last activity, remove.

- [ ] **Step 6: Student detail** — `.../students/[uid]/+page.server.ts` loads `GET /cohorts/{id}/students/{uid}` with the same 404/403/502 mapping and returns `{ detail }`. `+page.svelte`: `<h1>{detail.student.display_name}</h1><p>{detail.student.email} · joined {detail.student.joined_at}</p>`; `<h2>Results</h2>` table (Activity · Best · Latest · Attempts · Mastery · Time spent) with `formatPercent` and `Math.round(r.time_spent_s / 60)` minutes; `<h2>Attempts</h2>` — for each attempt a `<details open>` (open so the e2e can see the items) with `<summary>{a.title} — {formatPercent(a.percent)} — {a.submitted_at}</summary>` and an items table (Item · Response · Correct · Score) rendering `JSON.stringify(i.response)`; a back link to the cohort via `resolve`.

- [ ] **Step 7: Nav** — in `(app)/+layout.svelte` add a `<nav>` above `<main>`: links Home (`/home`), Subjects (`/subjects`); if `data.user.role !== 'student'` add Educator (`/educator`); if `data.user.role === 'admin'` add Admin (`/admin/users`); plus the existing sign-out form/link if one exists in the root layout (do not duplicate). The layout's `data` comes from `(app)/+layout.server.ts` (`user`). All hrefs through `resolve()`.

- [ ] **Step 8: Lint, types, tests** — `pnpm --filter web lint && pnpm --filter web check && pnpm --filter web test` → all green (run `pnpm --filter web format` first if prettier complains).

- [ ] **Step 9: Commit**

```bash
git add apps/web
git commit -m "feat(web): educator cohorts — list, create, overview with threshold and roster, student detail"
```

### Task 8: Student join-by-code on `/home`; admin users and audit pages

**Files:**
- Modify: `apps/web/src/routes/(app)/home/+page.server.ts`, `+page.svelte`
- Create: `apps/web/src/routes/(app)/admin/users/+page.server.ts`, `+page.svelte`, `apps/web/src/routes/(app)/admin/audit/+page.server.ts`, `+page.svelte`

- [ ] **Step 1: Home** — `load` additionally fetches `GET /cohorts` and returns `cohorts` (empty on failure). Add a `join` action:

```ts
join: async (event) => {
	const form = await event.request.formData();
	const code = String(form.get('code') ?? '').trim();
	const res = await apiJson(event, '/cohorts/join', { code });
	if (!res.ok) {
		const problem = await res.json().catch(() => undefined);
		return fail(res.status, { error: problemMessage(problem, res.status), code });
	}
	const cohort: CohortOut = await res.json();
	return { joined: cohort.name };
}
```

`+page.svelte` (students only — `{#if data.user.role === 'student'}`): `<h2>Your cohorts</h2>` list of `data.cohorts` names (or "You are not in a cohort yet."), then `<form method="POST" action="?/join" use:enhance><label for="code">Join code</label><input id="code" name="code" required minlength="6" maxlength="12" autocapitalize="characters" value={form?.code ?? ''}><button>Join cohort</button></form>`; `{#if form?.joined}<p aria-live="polite">Joined {form.joined}</p>{/if}` and `{#if form?.error}<p role="alert">{form.error}</p>{/if}`. Keep the results table as is.

- [ ] **Step 2: Admin users** — `load`: `GET /admin/users?q=&cursor=` from `event.url.searchParams`; returns `{ page, q }`. Actions `role` (`PATCH /admin/users/{id}/role {role}` from hidden `user_id` + `<select name="role">`) and `deactivate`. Template: a search form (`GET`, `<input name="q">`), a table (Email · Name · Role select+Save · Deactivated · Deactivate button), "Next page" link when `page.next_cursor`. Errors via `form?.error` with `role="alert"`.

- [ ] **Step 3: Admin audit** — `load`: `GET /admin/audit-log?action=&limit=100` (action filter from the query string); table Time · Actor · Action · Target · Cohort · IP · Request id · Detail (`JSON.stringify`). A `GET` filter form with `<input name="action">`.

- [ ] **Step 4: Lint, types, tests** — `pnpm --filter web lint && pnpm --filter web check && pnpm --filter web test` → green.

- [ ] **Step 5: Commit** — `git add apps/web && git commit -m "feat(web): join a cohort by code; admin users and audit-log pages"`

### Task 9: End-to-end cohort flow and CI wiring

**Files:**
- Create: `apps/web/e2e/cohort.e2e.ts`
- Modify: `.github/workflows/pr.yml` (nothing structural — the e2e job already seeds; confirm the seed's new output is fine), `docs/05-setup.md` (seed accounts list)

- [ ] **Step 1: Write the e2e** — `apps/web/e2e/cohort.e2e.ts` (header comment per the repo standard):

```ts
import { test, expect } from '@playwright/test';

const EDUCATOR = { email: 'educator@example.com', password: 'rtapps-dev-password' };

async function signIn(page: import('@playwright/test').Page, email: string, password: string) {
	await page.goto('/login');
	await page.waitForLoadState('networkidle');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password').fill(password);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL(/\/home$/);
}

async function signOut(page: import('@playwright/test').Page) {
	await page.getByRole('button', { name: 'Sign out' }).click(); // root layout form → POST /logout
	await expect(page).toHaveURL(/\/login$/);
}

test('educator creates a cohort, a student joins and completes a lesson, the educator sees it', async ({ page }) => {
	const stamp = Date.now();
	const cohortName = `E2E cohort ${stamp}`;
	const student = { email: `e2e-${stamp}@example.edu`, password: 'password-1234', name: `E2E ${stamp}` };

	// Educator: create the cohort and read its join code.
	await signIn(page, EDUCATOR.email, EDUCATOR.password);
	await page.getByRole('link', { name: 'Educator' }).click();
	await page.getByLabel('Cohort name').fill(cohortName);
	await page.getByRole('button', { name: 'Create cohort' }).click();
	await expect(page.getByRole('heading', { name: cohortName })).toBeVisible();
	const code = (await page.getByTestId('join-code').textContent())!.trim();
	expect(code).toMatch(/^[A-Z2-9]{6}$/);
	const cohortUrl = page.url();
	await signOut(page);

	// Student: register, join with the code, complete the lesson with one correct answer.
	await page.goto('/register');
	await page.waitForLoadState('networkidle');
	await page.getByLabel('Email').fill(student.email);
	await page.getByLabel('Display name').fill(student.name);
	await page.getByLabel('Password').fill(student.password);
	await page.getByRole('button', { name: 'Register' }).click();
	await expect(page).toHaveURL(/\/home$/);
	await page.getByLabel('Join code').fill(code);
	await page.getByRole('button', { name: 'Join cohort' }).click();
	await expect(page.getByText(`Joined ${cohortName}`)).toBeVisible();
	await page.goto('/lessons/rbe-and-oer');
	await expect(page.getByText('Page 1 of 7')).toBeVisible();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByLabel('RBE actually decreases past that point').check();
	await page.getByRole('button', { name: 'Check answer' }).click();
	await expect(page.getByText('Correct')).toBeVisible();
	for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Finish lesson' }).click();
	await expect(page.getByText('Score: 1 / 2')).toBeVisible();
	await signOut(page);

	// Educator: the overview shows the student at 50 %, and the detail shows the item response.
	await signIn(page, EDUCATOR.email, EDUCATOR.password);
	await page.goto(cohortUrl);
	const row = page.getByRole('row').filter({ hasText: student.email });
	await expect(row).toContainText('50.0%');
	await row.getByRole('link', { name: student.name }).click();
	await expect(page.getByRole('heading', { name: student.name })).toBeVisible();
	await expect(page.getByText('RBE and OER')).toBeVisible();
	await expect(page.getByText('lq_page2_1')).toBeVisible();

	// Rotate the code; the old one is refused for a second student.
	await page.goto(cohortUrl);
	await page.getByRole('button', { name: 'Rotate code' }).click();
	await expect(page.getByTestId('join-code')).not.toHaveText(code);
	await signOut(page);
	await page.goto('/register');
	await page.waitForLoadState('networkidle');
	await page.getByLabel('Email').fill(`e2e-b-${stamp}@example.edu`);
	await page.getByLabel('Display name').fill('Second');
	await page.getByLabel('Password').fill(student.password);
	await page.getByRole('button', { name: 'Register' }).click();
	await page.getByLabel('Join code').fill(code);
	await page.getByRole('button', { name: 'Join cohort' }).click();
	await expect(page.getByRole('alert')).toContainText('Join code not valid');
});
```

Adjust selectors to the markup produced in Tasks 7–8 (the test is the spec for that markup: `getByTestId('join-code')`, labels "Cohort name", "Join code", buttons "Create cohort", "Join cohort", "Rotate code", `role="alert"` on error messages, a heading with the cohort name / student name).

- [ ] **Step 2: Run locally** — `make dev` (in another terminal), `make seed`, then `pnpm --filter web e2e` → both e2e files pass. If the stack is not running locally, at minimum `pnpm --filter web exec playwright test --list` must show both tests and CI's `e2e` job is the gate.

- [ ] **Step 3: Docs** — `docs/05-setup.md` "Seed data": list the demo cohort (`DEMO42`) and `student01…10@example.com`.

- [ ] **Step 4: Commit** — `git add apps/web/e2e docs/05-setup.md && git commit -m "test(e2e): educator cohort flow — create, join, complete, see result, rotate"`

- [ ] **Step 5: Open the PR now** (so CI runs on every later push): `git push -u origin feat/educator-slice && gh pr create --title "feat: educator view and vertical slice (plan 2)" --body-file .superpowers/sdd/pr-body-2.md` — write the body file first (summary, task list, test plan; end with the `🤖 Generated with [Claude Code](https://claude.com/claude-code)` line). Note the `gh` token lacks the `workflow` scope, so pushes that add `.github/workflows/*.yml` are done via plain `git push`, and the PR is merged with local git at the end.

### Task 10: Production compose, Caddy/tunnel variants, backup container

**Files:**
- Create: `infra/compose.prod.yaml`, `infra/Caddyfile.prod`, `infra/compose.tunnel.yaml`, `infra/prod.env.example`, `infra/backup/Dockerfile`, `infra/backup/backup.sh`, `infra/backup/restore.sh`
- Modify: `.github/dependabot.yml` (docker ecosystem for `/infra/backup`), `Makefile` (`prod-config` target)

**Interfaces:** `compose.prod.yaml` reads `IMAGE_REPO` (default `ghcr.io/rad-therapy-apps/rtapps`) and `IMAGE_TAG` (git SHA) from the environment; services `proxy`, `web`, `api`, `db`, `backup`; no `storage` (prod uses an external S3 bucket per ADR-0005; `S3_*` values point at it); migrations are **not** run on start (`api` runs plain uvicorn). The `test` VM uses this same file.

- [ ] **Step 1: `infra/compose.prod.yaml`**

```yaml
name: rtapps

services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - ${PGDATA_PATH:-pgdata}:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 3s
      retries: 10
    restart: unless-stopped
    logging: &logging
      driver: json-file
      options: { max-size: "10m", max-file: "5" }

  api:
    image: ${IMAGE_REPO:-ghcr.io/rad-therapy-apps/rtapps}-api:${IMAGE_TAG:-latest}
    environment:
      ENV: prod
      DATABASE_URL: ${DATABASE_URL}
      SESSION_SECRET: ${SESSION_SECRET}
      PUBLIC_ORIGIN: ${PUBLIC_ORIGIN}
      S3_ENDPOINT: ${S3_ENDPOINT}
      S3_ACCESS_KEY: ${S3_ACCESS_KEY}
      S3_SECRET_KEY: ${S3_SECRET_KEY}
      S3_BUCKET: ${S3_BUCKET}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:-}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET:-}
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "python -c \"import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/api/v1/health').status==200 else 1)\""]
      interval: 10s
      timeout: 5s
      retries: 6
      start_period: 15s
    restart: unless-stopped
    logging: *logging

  web:
    image: ${IMAGE_REPO:-ghcr.io/rad-therapy-apps/rtapps}-web:${IMAGE_TAG:-latest}
    environment:
      API_INTERNAL_URL: http://api:8000
      ORIGIN: ${PUBLIC_ORIGIN}
      PORT: "3000"
    depends_on:
      api:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
      interval: 10s
      timeout: 5s
      retries: 6
      start_period: 10s
    restart: unless-stopped
    logging: *logging

  proxy:
    image: caddy:2
    volumes:
      - ./Caddyfile.prod:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
      - caddy-config:/config
    environment:
      SITE_ADDRESS: ${SITE_ADDRESS:-:80}
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - web
      - api
    restart: unless-stopped
    logging: *logging

  backup:
    build: ./backup
    image: ${IMAGE_REPO:-ghcr.io/rad-therapy-apps/rtapps}-backup:${IMAGE_TAG:-latest}
    environment:
      PGHOST: db
      PGUSER: ${POSTGRES_USER}
      PGPASSWORD: ${POSTGRES_PASSWORD}
      PGDATABASE: ${POSTGRES_DB}
      S3_ENDPOINT: ${S3_ENDPOINT}
      S3_ACCESS_KEY: ${S3_ACCESS_KEY}
      S3_SECRET_KEY: ${S3_SECRET_KEY}
      BACKUP_BUCKET: ${BACKUP_BUCKET}
      BACKUP_AGE_RECIPIENT: ${BACKUP_AGE_RECIPIENT}
      BACKUP_RETENTION_DAYS: ${BACKUP_RETENTION_DAYS:-30}
      BACKUP_HOUR_UTC: ${BACKUP_HOUR_UTC:-03}
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
    logging: *logging

volumes:
  pgdata:
  caddy-data:
  caddy-config:
```

`infra/Caddyfile.prod` = the dev Caddyfile's routing (`/api/*` → `api:8000`, else → `web:3000`) plus the same security headers **and** `Strict-Transport-Security "max-age=31536000; includeSubDomains"` (NFR-08), with the site block `{$SITE_ADDRESS}` so `SITE_ADDRESS=rt.example.edu` gives automatic TLS on 80/443 and `SITE_ADDRESS=:80` (tunnel mode) serves plain HTTP internally. Remove the `auto_https off` global block; add `{ email {$ACME_EMAIL} }` as the global block only when `ACME_EMAIL` is set — simplest: keep a global block `{ admin off }` and let Caddy infer TLS from the address.

`infra/compose.tunnel.yaml` (overlay used as `-f compose.prod.yaml -f compose.tunnel.yaml`): adds

```yaml
services:
  proxy:
    ports: !override []
  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel --no-autoupdate run --token ${CLOUDFLARE_TUNNEL_TOKEN}
    depends_on: [proxy]
    restart: unless-stopped
```

(Compose v2.24+ supports `!override`. State the minimum Compose version in `docs/06-operations.md`.)

`infra/prod.env.example` — every variable above with **placeholder** values (`SESSION_SECRET=replace-with-64-random-chars`, `POSTGRES_PASSWORD=replace-me`, `IMAGE_TAG=` left empty, `PUBLIC_ORIGIN=https://rt.example.edu`, `SITE_ADDRESS=:80`, `BACKUP_AGE_RECIPIENT=age1...`), each with a one-line comment. No real secrets ever go in this file.

- [ ] **Step 2: Backup container**

`infra/backup/Dockerfile`:

```dockerfile
FROM minio/mc:RELEASE.2025-08-13T08-35-41Z AS mc
FROM alpine:3.21
RUN apk add --no-cache postgresql16-client age bash coreutils
COPY --from=mc /usr/bin/mc /usr/bin/mc
COPY backup.sh restore.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/restore.sh
ENTRYPOINT ["/usr/local/bin/backup.sh"]
```

(Use the newest `minio/mc` release tag available — check `docker run --rm minio/mc:latest --version` — and pin it; Dependabot's docker ecosystem watches `/infra/backup`.)

`infra/backup/backup.sh` — a loop: `mc alias set backup "$S3_ENDPOINT" "$S3_ACCESS_KEY" "$S3_SECRET_KEY"`; every iteration sleeps until the next `BACKUP_HOUR_UTC:00`, then `pg_dump -Fc | age -r "$BACKUP_AGE_RECIPIENT" > /tmp/rtapps-$(date -u +%Y%m%dT%H%M%SZ).dump.age`, `mc cp` it to `backup/$BACKUP_BUCKET/postgres/`, then `mc rm --recursive --force --older-than "${BACKUP_RETENTION_DAYS}d" backup/$BACKUP_BUCKET/postgres/`; `set -euo pipefail`; `RUN_ONCE=1` env runs a single backup and exits (used by the restore drill and by a smoke test). Log one line per action.

`infra/backup/restore.sh OBJECT_NAME TARGET_DB` — `mc cp` the object, `age -d -i /run/secrets/age-key` (the identity file is bind-mounted at restore time only), `pg_restore --clean --if-exists -d "$TARGET_DB"`; documented in `docs/06-operations.md` as the monthly drill into a scratch database `rtapps_restore_check`.

- [ ] **Step 3: Validate** — from the repo root: `docker compose -f infra/compose.prod.yaml --env-file infra/prod.env.example config -q` (must pass with the example values) and `docker compose -f infra/compose.prod.yaml -f infra/compose.tunnel.yaml --env-file infra/prod.env.example config -q`; `docker build infra/backup -t rtapps-backup:local` and `docker run --rm --entrypoint sh rtapps-backup:local -c 'pg_dump --version && age --version && mc --version'`. Add a `Makefile` target `prod-config` that runs the two `config -q` commands, and a `prod-config` step in the CI `images` job (Task 11 adds the workflow changes; put the Makefile target in now).

- [ ] **Step 4: Commit** — `git add infra Makefile .github/dependabot.yml && git commit -m "feat(infra): production compose with Caddy TLS or Cloudflare Tunnel and encrypted nightly backups"`

### Task 11: `main.yml` (images to GHCR + migration dry-run) and `deploy.yml` (SSH deploy with rollback)

**Files:**
- Create: `.github/workflows/main.yml`, `.github/workflows/deploy.yml`, `infra/deploy/deploy.sh`
- Modify: `.github/workflows/pr.yml` (`images` job runs `make prod-config`; nothing else), `docs/06-operations.md` (written in Task 12 — this task writes the workflow-facing part as a stub section the docs task completes)

- [ ] **Step 1: `main.yml`**

```yaml
name: main
on:
  push:
    branches: [main]
    tags: ["v*"]
permissions:
  contents: read
  packages: write
concurrency:
  group: main-${{ github.ref }}
env:
  IMAGE_REPO: ghcr.io/${{ github.repository_owner }}/rtapps
jobs:
  images:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        include:
          - { name: api, file: apps/api/Dockerfile, context: . }
          - { name: web, file: apps/web/Dockerfile, context: . }
          - { name: backup, file: infra/backup/Dockerfile, context: infra/backup }
    steps:
      - uses: actions/checkout@v7
      - uses: docker/setup-qemu-action@v4
      - uses: docker/setup-buildx-action@v4
      - uses: docker/login-action@v4
        with: { registry: ghcr.io, username: "${{ github.actor }}", password: "${{ secrets.GITHUB_TOKEN }}" }
      - id: meta
        uses: docker/metadata-action@v6
        with:
          images: ${{ env.IMAGE_REPO }}-${{ matrix.name }}
          tags: |
            type=sha,format=long,prefix=
            type=ref,event=tag
            type=raw,value=latest,enable={{is_default_branch}}
      - uses: docker/build-push-action@v7
        with:
          context: ${{ matrix.context }}
          file: ${{ matrix.file }}
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha,scope=${{ matrix.name }}
          cache-to: type=gha,mode=max,scope=${{ matrix.name }}

  migrate-dry-run:
    runs-on: ubuntu-latest
    needs: images
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_USER: rtapps, POSTGRES_PASSWORD: rtapps, POSTGRES_DB: rtapps }
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U rtapps" --health-interval 5s --health-timeout 3s --health-retries 10
    steps:
      - uses: docker/login-action@v4
        with: { registry: ghcr.io, username: "${{ github.actor }}", password: "${{ secrets.GITHUB_TOKEN }}" }
      # Upgrade to head, downgrade to base, upgrade again — from the *published* api image.
      - run: |
          for cmd in "upgrade head" "downgrade base" "upgrade head"; do
            docker run --rm --network host \
              -e DATABASE_URL=postgresql+asyncpg://rtapps:rtapps@localhost:5432/rtapps \
              -e ENV=test -e SESSION_SECRET=ci-only-secret-with-at-least-32-characters \
              ${{ env.IMAGE_REPO }}-api:${{ github.sha }} alembic $cmd
          done

  deploy-test:
    needs: [images, migrate-dry-run]
    if: github.ref == 'refs/heads/main'
    uses: ./.github/workflows/deploy.yml
    with: { environment: test, image_tag: "${{ github.sha }}" }
    secrets: inherit
```

- [ ] **Step 2: `deploy.yml`** (reusable + manual):

```yaml
name: deploy
on:
  workflow_call:
    inputs:
      environment: { type: string, required: true }
      image_tag: { type: string, required: true }
  workflow_dispatch:
    inputs:
      environment: { type: choice, options: [test, prod], default: test }
      image_tag: { type: string, description: "Git SHA (or tag) of the images to deploy", required: true }
permissions:
  contents: read
  packages: read
concurrency:
  group: deploy-${{ inputs.environment }}
  cancel-in-progress: false
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - uses: actions/checkout@v7
      - name: Skip when the environment has no host configured
        id: gate
        run: echo "configured=${{ secrets.DEPLOY_HOST != '' }}" >> "$GITHUB_OUTPUT"
      - if: steps.gate.outputs.configured == 'true'
        name: Configure SSH
        run: |
          mkdir -p ~/.ssh && chmod 700 ~/.ssh
          printf '%s\n' "${{ secrets.DEPLOY_SSH_KEY }}" > ~/.ssh/id_ed25519 && chmod 600 ~/.ssh/id_ed25519
          printf '%s\n' "${{ secrets.DEPLOY_KNOWN_HOSTS }}" > ~/.ssh/known_hosts
      - if: steps.gate.outputs.configured == 'true'
        name: Copy compose files
        run: |
          scp -r infra/compose.prod.yaml infra/compose.tunnel.yaml infra/Caddyfile.prod infra/backup infra/deploy \
            "${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }}:/opt/rtapps/"
      - if: steps.gate.outputs.configured == 'true'
        name: Deploy
        run: |
          ssh "${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }}" \
            "GHCR_TOKEN='${{ secrets.GITHUB_TOKEN }}' GHCR_USER='${{ github.actor }}' \
             bash /opt/rtapps/deploy/deploy.sh '${{ inputs.image_tag }}'"
      - if: steps.gate.outputs.configured == 'true'
        name: Smoke test
        run: curl --fail --silent --show-error --max-time 20 "${{ vars.PUBLIC_URL }}/api/v1/health"
      - if: steps.gate.outputs.configured != 'true'
        run: echo "::notice::Environment ${{ inputs.environment }} has no DEPLOY_HOST secret — nothing deployed."
```

The "no host configured" gate is what lets `main.yml` stay green before the VM exists.

- [ ] **Step 3: `infra/deploy/deploy.sh`** (runs on the VM; `set -euo pipefail`; header comment):

```bash
#!/usr/bin/env bash
# Usage: deploy.sh IMAGE_TAG  — pull images, migrate, restart, health-check, roll back on failure.
set -euo pipefail
TAG="$1"
cd /opt/rtapps
export IMAGE_TAG="$TAG"
FILES=(-f compose.prod.yaml)
[ "${USE_TUNNEL:-0}" = "1" ] && FILES+=(-f compose.tunnel.yaml)
COMPOSE=(docker compose --env-file .env "${FILES[@]}")
PREV="$(cat .deployed 2>/dev/null || true)"

echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
"${COMPOSE[@]}" pull --quiet
# Migrations are a one-shot step BEFORE the new containers start (ADR-0005).
"${COMPOSE[@]}" run --rm --no-deps api alembic upgrade head
if "${COMPOSE[@]}" up -d --remove-orphans --wait --wait-timeout 180; then
  echo "$TAG" > .deployed
  echo "deployed $TAG (previous: ${PREV:-none})"
else
  echo "deploy of $TAG failed" >&2
  if [ -n "$PREV" ]; then
    echo "rolling back to $PREV" >&2
    IMAGE_TAG="$PREV" "${COMPOSE[@]}" up -d --remove-orphans --wait --wait-timeout 180 || true
  fi
  exit 1
fi
docker image prune -f >/dev/null
```

The `.env` on the VM must set `USE_TUNNEL=1` when using Cloudflare Tunnel. (`docker compose --env-file` also exports `USE_TUNNEL` into the script's environment only if the script sources it — add `set -a; . ./.env; set +a` after `cd`.)

- [ ] **Step 4: GitHub Environments** — create them so the workflow's `environment:` resolves: `gh api -X PUT repos/rad-therapy-apps/rtapps/environments/test` and `.../environments/prod` with `-f 'reviewers[][type]=User' -f 'reviewers[][id]=<owner user id>'` for prod (`gh api user -q .id`). Set the `test` environment variable `PUBLIC_URL` to a placeholder only when the owner has a URL — leave unset otherwise (the smoke-test step is gated by `DEPLOY_HOST` anyway). Record the exact commands in `docs/06-operations.md`.

- [ ] **Step 5: Validate** — `actionlint` if available (`brew install actionlint`, then `actionlint .github/workflows/*.yml`); otherwise `python3 -c "import yaml,sys; [yaml.safe_load(open(f)) for f in sys.argv[1:]]" .github/workflows/*.yml`. `bash -n infra/deploy/deploy.sh`. Add `make prod-config` as a step of the `images` job in `pr.yml`.

- [ ] **Step 6: Commit and push** (plain `git push` — the token can push workflow files over SSH/HTTPS git, it just cannot create PRs that touch them through the API): `git add .github infra/deploy && git commit -m "ci: main.yml builds multi-arch images to GHCR and dry-runs migrations; deploy.yml deploys over SSH with rollback"`

### Task 12: Documentation, ADR-0001 evidence, PR, merge, tag `v0.2.0`

**Files:**
- Create: `docs/06-operations.md`
- Modify: `docs/adr/0001-backend-stack-fastapi-postgres.md` (Phase 2 evidence section), `docs/03-architecture.md` (§6.2 implemented list, §7 ✅ markers, §10.2), `docs/02-requirements.md` (statuses → `implemented`: FR-S-06, FR-E-01/02/03/04/05/09/10, FR-M-01/02/04, FR-X-02, NFR-08/25; note deferrals), `docs/05-setup.md` (link to 06), `docs/04-conventions.md` §9 (`make prod-config`), `README.md` (status line), `.github/workflows/pr.yml` header comment (deploy pipelines now exist)

- [ ] **Step 1: `docs/06-operations.md`** — sections: **Provision the test VM** (Oracle A1 Ubuntu 24.04 or Hetzner CAX11; `apt install docker.io docker-compose-v2` or Docker's repo; `useradd -m deploy` in the `docker` group; `/opt/rtapps` owned by `deploy`; `ssh-keygen -t ed25519` for the deploy key; `ssh-keyscan HOST` for `DEPLOY_KNOWN_HOSTS`), **Configure `/opt/rtapps/.env`** (copy `infra/prod.env.example`; generate `SESSION_SECRET` with `openssl rand -hex 32`; `age-keygen` for the backup key — public key in `.env`, private key kept offline), **Ingress** (A: Caddy TLS — open 80/443, set `SITE_ADDRESS=your.host`; B: Cloudflare Tunnel — `USE_TUNNEL=1`, `CLOUDFLARE_TUNNEL_TOKEN`, no open ports), **GitHub Environment secrets** (the five names; `gh secret set DEPLOY_HOST --env test`, …; `gh variable set PUBLIC_URL --env test`), **Deploy** (push to main → `main.yml` → `deploy-test`; manual `gh workflow run deploy.yml -f environment=test -f image_tag=<sha>`; promote to prod = same with `prod` + reviewer approval), **First deploy** (`docker compose run --rm api python -m app.seed` only on test; promote the mentor via `/admin/users`), **Verify** (`curl PUBLIC_URL/api/v1/health`; `E2E_BASE_URL=PUBLIC_URL pnpm --filter web e2e` runs AT-11 against the deployed URL), **Backups and the restore drill** (where objects land, `RUN_ONCE=1 docker compose run --rm backup`, `restore.sh` into `rtapps_restore_check`, monthly), **Rollback** (`deploy.sh` auto-rollback; manual = `gh workflow run deploy.yml -f image_tag=<previous sha>`), **Monthly checklist** (`apt upgrade` + reboot window, check backups uploaded, rotate the age key yearly, review `/admin/audit`), **Retention** (audit log ≥ 2 years, backups 30 days).

- [ ] **Step 2: ADR-0001 § "Phase 2 evidence (M2)"** — fill the four measurements the ADR promised: `pr.yml` wall time (read from `gh run list --workflow pr.yml --limit 5 --json durationMs` … use the last green run on this branch), p95 of attempt submit (from the local stack: `for i in $(seq 1 30)` curl timings via the Playwright trace or a 10-line `httpx` script in the scratchpad — record the number and the method), auth module LOC (`wc -l apps/api/app/auth/*.py`) vs. a stated Django estimate (allauth + DRF ≈ 0 own lines but ~40 config lines; say so honestly), `MissingGreenlet` incidents = 1 (Task 3 of plan 1c, fixed by building trees through relationships). Keep the ADR's status Accepted.

- [ ] **Step 3: Architecture / requirements / README** — as listed above; in §6.2 mark `cohort`, `enrollment`, `activity_result`, `audit_log` implemented (note `program` deferred); §7 ✅ on cohorts/analytics (overview, student)/admin (users, role, deactivate, audit-log); §10.2 link to `docs/06-operations.md`.

- [ ] **Step 4: Full gates** — `make lint && make test && make client && git diff --exit-code -- packages/api-client` (client must be unchanged after docstring edits — if it changed, commit the regenerated client), then push and wait for CI: `gh pr checks --watch`. All six `pr.yml` jobs green.

- [ ] **Step 5: Final whole-branch review** (subagent-driven-development: `scripts/review-package $(git merge-base main HEAD) HEAD`, targeted at the authorization boundaries — `require_cohort_educator`, admin self-change guard, join-code enumeration (6 chars from 32 → 2^30; note rate limiting is deferred and record it as a backlog issue), the deploy script's secret handling — plus a comments-only verification that every new file carries the header block). Fix Critical/Important findings; record Minor ones in the ledger.

- [ ] **Step 6: Merge and tag** — squash-merge with local git (`git checkout main && git pull && git merge --squash feat/educator-slice && git commit -m "feat: educator view and deployed vertical slice — cohorts, rollups, audit, admin, prod infra, deploy pipelines (#PR)"`), push, `git tag -a v0.2.0 -m "M2: educator view and vertical slice" && git push origin v0.2.0` (this triggers `main.yml`, which builds the images and — with no `DEPLOY_HOST` yet — reports the deploy as skipped). Close the PR and issues #14 (digest pinning is handled by SHA-tagged first-party images + Dependabot on `postgres`/`caddy` — say so in the closing comment, or leave #14 open if the reviewer disagrees) and note #15 stays open. Delete the branch. Append `PLAN 2 COMPLETE …` to `.superpowers/sdd/progress-2.md`.
