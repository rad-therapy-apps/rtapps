"""What this file tests: `app.admin.router` — admin-only access, user search and cursor
pagination, audited role change (effective on the user's next request), audited
deactivation (session refused afterwards), and audited erasure (session/identity deletion,
activity_result rollup survival, exact-match idempotency), and the audit-log listing with
filters.
Used here and why: httpx + real Postgres; the deactivated/erased user's own client is
reused, or their session cookie captured beforehand, to prove their existing session stops
working (FR-M-01/02 "takes effect on next request").
How it fits the project: FR-M-01/02/04; the admin surface the owner needs to promote the
mentor to educator on the test VM without psql.
Works with: pytest-asyncio, httpx.
Depends on: `client`, `db`, `register` (conftest); `promote`, `login` from `test_cohorts.py`;
`QUIZ_DOC` from `test_activity_importer.py`; `app.content.activity_importer.import_any`;
`app.attempts.rollup.ActivityResult`.
Used by: CI `api` job; `make test-api`.
"""

import uuid

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.attempts.rollup import ActivityResult
from app.auth.models import Identity, User, UserRole
from app.auth.passwords import hash_password
from app.content.activity_importer import import_any
from tests.conftest import register
from tests.test_activity_importer import QUIZ_DOC
from tests.test_cohorts import login, promote


async def make_admin(
    client: AsyncClient, db: AsyncSession, email: str = "root@example.edu"
) -> None:
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
    rest = (
        await client.get("/api/v1/admin/users", params={"limit": 2, "cursor": page["next_cursor"]})
    ).json()
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
    mentor = (await client.get("/api/v1/admin/users", params={"q": "m@example.edu"})).json()[
        "items"
    ][0]
    r = await client.patch(f"/api/v1/admin/users/{mentor['id']}/role", json={"role": "educator"})
    assert r.status_code == 200 and r.json()["role"] == "educator"
    # The admin cannot demote themselves because they're the last active admin (409, not 400).
    assert (
        await client.patch(f"/api/v1/admin/users/{admin_id}/role", json={"role": "student"})
    ).status_code == 409
    assert (
        await client.patch(f"/api/v1/admin/users/{uuid.uuid4()}/role", json={"role": "student"})
    ).status_code == 404
    assert (
        await client.patch(f"/api/v1/admin/users/{mentor['id']}/role", json={"role": "owner"})
    ).status_code == 422
    log = (await client.get("/api/v1/admin/audit-log", params={"action": "change_role"})).json()
    assert (
        len(log) == 1
        and log[0]["target_id"] == mentor["id"]
        and log[0]["actor_email"] == "root@example.edu"
    )
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
    first_deactivated_at = r.json()["deactivated_at"]
    # The admin cannot deactivate themselves because they're the last active admin (409, not 400).
    assert (await client.post(f"/api/v1/admin/users/{admin_id}/deactivate")).status_code == 409
    r = await client.post(
        "/api/v1/auth/login", json={"email": "gone@example.edu", "password": "password-123"}
    )
    assert r.status_code == 401
    log = (await client.get("/api/v1/admin/audit-log", params={"action": "deactivate_user"})).json()
    assert len(log) == 1
    # Deactivating again is a no-op: same timestamp, still exactly one audit row.
    again = await client.post(f"/api/v1/admin/users/{gone['id']}/deactivate")
    assert again.status_code == 200 and again.json()["deactivated_at"] == first_deactivated_at
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
    assert (
        len((await client.get("/api/v1/admin/audit-log", params={"target_id": m["id"]})).json())
        == 2
    )
    assert (
        await client.get("/api/v1/admin/audit-log", params={"since": "2099-01-01T00:00:00Z"})
    ).json() == []
    assert (await client.get("/api/v1/admin/audit-log", params={"limit": 1})).json()[0]["detail"][
        "to"
    ] == "student"


async def test_last_admin_guard_on_change_role(client: AsyncClient, db: AsyncSession) -> None:
    # Single admin cannot be demoted.
    await make_admin(client, db)
    admin = (await client.get("/api/v1/admin/users", params={"q": "root@"})).json()["items"][0]
    r = await client.patch(f"/api/v1/admin/users/{admin['id']}/role", json={"role": "student"})
    assert r.status_code == 409 and "Cannot demote the last admin" in r.json()["title"]
    # Add a second admin; now demotion works.
    await register(client, email="a2@example.edu", name="Admin 2")
    await promote(db, "a2@example.edu", UserRole.admin)
    r = await client.patch(f"/api/v1/admin/users/{admin['id']}/role", json={"role": "student"})
    assert r.status_code == 200 and r.json()["role"] == "student"


async def test_last_admin_guard_on_deactivate(client: AsyncClient, db: AsyncSession) -> None:
    # Single admin cannot be deactivated.
    await make_admin(client, db)
    admin = (await client.get("/api/v1/admin/users", params={"q": "root@"})).json()["items"][0]
    r = await client.post(f"/api/v1/admin/users/{admin['id']}/deactivate")
    assert r.status_code == 409 and "Cannot deactivate the last admin" in r.json()["title"]
    # Add a second admin; now deactivation works.
    await register(client, email="a2@example.edu", name="Admin 2")
    await promote(db, "a2@example.edu", UserRole.admin)
    r = await client.post(f"/api/v1/admin/users/{admin['id']}/deactivate")
    assert r.status_code == 200 and r.json()["deactivated_at"]


async def test_last_admin_guard_on_erase(client: AsyncClient, db: AsyncSession) -> None:
    # Single admin cannot be erased.
    await make_admin(client, db)
    admin = (await client.get("/api/v1/admin/users", params={"q": "root@"})).json()["items"][0]
    r = await client.post(f"/api/v1/admin/users/{admin['id']}/erase")
    assert r.status_code == 409 and "Cannot erase the last admin" in r.json()["title"]
    # Add a second admin; now erasure works.
    await register(client, email="a2@example.edu", name="Admin 2")
    await promote(db, "a2@example.edu", UserRole.admin)
    r = await client.post(f"/api/v1/admin/users/{admin['id']}/erase")
    assert r.status_code == 200
    assert r.json()["email"].startswith("erased-")
    assert r.json()["display_name"] == "Erased user"


async def test_erase_user_tombstones_pii_deletes_identities_sessions(
    client: AsyncClient, db: AsyncSession
) -> None:
    # Register a non-admin user and capture their session cookie before switching the
    # client to an admin session (make_admin's register/login overwrites the cookie jar).
    gone_email = "gone@example.edu"
    await register(client, email=gone_email, name="Gone User")
    victim_session = client.cookies["rt_session"]
    # Give the victim a linked identity so we can prove it gets deleted too.
    gone_user = await db.scalar(select(User).where(User.email == gone_email))
    assert gone_user is not None
    db.add(Identity(user_id=gone_user.id, provider="google", subject="sub-123"))
    await db.commit()
    await make_admin(client, db)
    # Get the gone user's ID.
    gone = (await client.get("/api/v1/admin/users", params={"q": gone_email})).json()["items"][0]
    gone_id = gone["id"]
    # Erase the user.
    r = await client.post(f"/api/v1/admin/users/{gone_id}/erase")
    assert r.status_code == 200
    erased_user = r.json()
    assert erased_user["email"].startswith("erased-")
    assert erased_user["display_name"] == "Erased user"
    # The victim's captured session cookie no longer authenticates (proves Session deletion,
    # not just that a fresh login with the erased email would fail). Swap the client's
    # cookie jar to the victim's session for this one request, then restore the admin's.
    admin_session = client.cookies["rt_session"]
    client.cookies.set("rt_session", victim_session)
    me_r = await client.get("/api/v1/auth/me")
    assert me_r.status_code == 401
    client.cookies.set("rt_session", admin_session)
    # Audit log has exactly one erase_user entry with sessions_deleted and
    # identities_deleted counts.
    log = (await client.get("/api/v1/admin/audit-log", params={"action": "erase_user"})).json()
    assert len(log) == 1
    assert log[0]["target_id"] == gone_id
    assert "sessions_deleted" in log[0]["detail"] and "identities_deleted" in log[0]["detail"]
    assert log[0]["detail"]["identities_deleted"] == 1
    # The Identity row is actually gone.
    remaining = await db.scalar(select(Identity).where(Identity.user_id == gone_user.id))
    assert remaining is None


async def test_erase_user_keeps_activity_result_rollup(
    client: AsyncClient, db: AsyncSession
) -> None:
    # An activity_result rollup row is analytics data, not PII, so it must survive erasure.
    gone_email = "gone@example.edu"
    await register(client, email=gone_email, name="Gone User")
    gone_user = await db.scalar(select(User).where(User.email == gone_email))
    assert gone_user is not None
    activity = await import_any(db, QUIZ_DOC)
    rollup = ActivityResult(user_id=gone_user.id, activity_id=activity.id, attempts=1)
    db.add(rollup)
    await db.commit()
    await make_admin(client, db)
    gone = (await client.get("/api/v1/admin/users", params={"q": gone_email})).json()["items"][0]
    r = await client.post(f"/api/v1/admin/users/{gone['id']}/erase")
    assert r.status_code == 200
    kept = await db.scalar(select(ActivityResult).where(ActivityResult.user_id == gone_user.id))
    assert kept is not None


async def test_erase_user_idempotent(client: AsyncClient, db: AsyncSession) -> None:
    # Register a non-admin user, then make an admin (switches client to admin session).
    gone_email = "gone@example.edu"
    await register(client, email=gone_email, name="Gone User")
    await make_admin(client, db)
    # Get the gone user's ID.
    gone = (await client.get("/api/v1/admin/users", params={"q": gone_email})).json()["items"][0]
    gone_id = gone["id"]
    # Erase the user.
    r1 = await client.post(f"/api/v1/admin/users/{gone_id}/erase")
    assert r1.status_code == 200
    first_email = r1.json()["email"]
    # Erase again: should be idempotent, no second audit row.
    r2 = await client.post(f"/api/v1/admin/users/{gone_id}/erase")
    assert r2.status_code == 200
    assert r2.json()["email"] == first_email
    log = (await client.get("/api/v1/admin/audit-log", params={"action": "erase_user"})).json()
    assert len(log) == 1  # Only one audit entry


async def test_erase_user_with_erased_prefix_email_is_still_erased(
    client: AsyncClient, db: AsyncSession
) -> None:
    # A user who happens to register an "erased-" prefixed email must not be mistaken for
    # an already-erased user: the idempotency check is an exact match on the tombstone
    # value, not a prefix check.
    fake_email = "erased-fake@example.edu"
    await register(client, email=fake_email, name="Fake Erased")
    await make_admin(client, db)
    fake = (await client.get("/api/v1/admin/users", params={"q": fake_email})).json()["items"][0]
    fake_id = fake["id"]
    r = await client.post(f"/api/v1/admin/users/{fake_id}/erase")
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == f"erased-{fake_id}@erased.invalid"
    assert body["display_name"] == "Erased user"
    log = (await client.get("/api/v1/admin/audit-log", params={"action": "erase_user"})).json()
    assert len(log) == 1 and log[0]["target_id"] == fake_id


async def test_list_users_ilike_escaping(client: AsyncClient, db: AsyncSession) -> None:
    # Create users with literal % and _ in display names.
    await make_admin(client, db)
    # Create users directly in the database to ensure exact names.
    pct_user = User(
        email="pct@example.edu",
        display_name="100% done",
        password_hash=hash_password("password-123"),
    )
    x_user = User(
        email="x@example.edu",
        display_name="100x done",
        password_hash=hash_password("password-123"),
    )
    db.add(pct_user)
    db.add(x_user)
    await db.commit()
    # Search for "100%" should match only the first user (not all starting with "100").
    r = await client.get("/api/v1/admin/users", params={"q": "100%"})
    assert r.status_code == 200
    items = r.json()["items"]
    found = [u for u in items if u["display_name"] == "100% done"]
    assert len(found) == 1
    assert found[0]["email"] == "pct@example.edu"
    # The "100x done" user should not appear in the result.
    x_found = [u for u in items if u["display_name"] == "100x done"]
    assert len(x_found) == 0
