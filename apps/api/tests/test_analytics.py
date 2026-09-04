"""What this file tests: `GET /cohorts/{id}/overview`, `GET /cohorts/{id}/students/{uid}`,
`GET /cohorts/{id}/activities/{aid}`, and `GET /cohorts/{id}/outcomes` in
`app.analytics.router` — aggregates from `activity_result`, the threshold flag, cohort
scoping (a student outside the cohort is invisible), the AT-11/AT-12 permission outcome
(owner 200 and audited; another educator 403 and not audited), the shape of per-attempt
items, per-activity score distribution and per-item correctness, and per-outcome mastery.
Used here and why: builds real attempts through the HTTP flow so the numbers come from the
same rollup/grading code the product uses; two cohorts to prove scoping.
How it fits the project: FR-E-04/05/06/07/09/10 — the educator half of the M2 vertical
slice plus 3a's activity stats and outcome mastery.
Works with: pytest-asyncio, httpx.
Depends on: `client`, `db`, `register`, `seed_lesson` (conftest); `make_educator`, `login`,
`create_cohort` from `tests/test_cohorts.py`; `import_any`, `QUIZ_DOC` from
`tests/test_activity_importer.py`; `app.audit.models.AuditLog`, `app.content.models
.ContentVersion`.
Used by: CI `api` job; `make test-api`.
"""

import uuid
from typing import Any

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.models import AuditLog
from app.content.activity_importer import import_any
from app.content.models import Activity, ContentVersion
from tests.conftest import register, seed_lesson
from tests.test_activity_importer import QUIZ_DOC
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
    # `GET /lessons/{slug}` requires a signed-in session (app.content.router), so this must
    # come after some register/login call — make_educator's register() leaves one behind.
    await make_educator(client, db, "e@example.edu")
    aid = (await client.get("/api/v1/lessons/rbe-and-oer")).json()["activity_id"]
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
    audits = (
        await db.scalars(select(AuditLog).where(AuditLog.action == "read_cohort_overview"))
    ).all()
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
        {
            "item_key": "lq_page2_1",
            "response": {"choice": 1},
            "correct": True,
            "score": 1.0,
            "max_score": 1.0,
        }
    ]
    audits = (
        await db.scalars(select(AuditLog).where(AuditLog.action == "read_student_detail"))
    ).all()
    assert len(audits) == 1 and audits[0].target_id == uuid.UUID(a["user_id"])


async def test_student_outside_cohort_is_404(client: AsyncClient, db: AsyncSession) -> None:
    ctx = await _setup(client, db)
    await login(client, "f@example.edu")
    d = (await client.get(f"/api/v1/cohorts/{ctx['other']['id']}/members")).json()[0]
    await login(client, "e@example.edu")
    r = await client.get(f"/api/v1/cohorts/{ctx['cohort']['id']}/students/{d['user_id']}")
    assert r.status_code == 404
    # The cohort's own educator is enrolled, but not as a student: same 404.
    me = (await client.get("/api/v1/auth/me")).json()
    r = await client.get(f"/api/v1/cohorts/{ctx['cohort']['id']}/students/{me['id']}")
    assert r.status_code == 404 and r.json()["title"] == "Student not in cohort"
    # Neither 404 wrote an audit row (the read never happened).
    reads = (
        await db.scalars(select(AuditLog).where(AuditLog.action == "read_student_detail"))
    ).all()
    assert reads == []


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
    reads = (
        await db.scalars(
            select(AuditLog).where(
                AuditLog.action.in_(["read_cohort_overview", "read_student_detail"])
            )
        )
    ).all()
    assert reads == []


async def _quiz_setup(client: AsyncClient, db: AsyncSession) -> dict[str, Any]:
    """Educator E owns cohort C; a quiz activity (q1 tagged RB-1, q2 tagged RB-1 + RB-2).
    Student A answers both correctly (100%); student B gets q1 wrong (choice=2 -> "C") and
    q2 right (50%)."""
    activity = await import_any(db, QUIZ_DOC)
    version = await db.get(ContentVersion, activity.current_version_id)
    assert version is not None
    q1_key, q2_key = (q["key"] for q in version.snapshot["quiz"]["questions"])
    await make_educator(client, db, "e@example.edu")
    cohort = await create_cohort(client, "C")
    for email, name, choices in (
        ("a@example.edu", "Student A", (0, 1)),  # both correct: 100%
        ("b@example.edu", "Student B", (2, 1)),  # q1 wrong, q2 right: 50%
    ):
        await register(client, email=email, name=name)
        assert (
            await client.post("/api/v1/cohorts/join", json={"code": cohort["join_code"]})
        ).status_code == 200
        attempt = (await client.post(f"/api/v1/activities/{activity.id}/attempts")).json()
        for key, choice in zip((q1_key, q2_key), choices, strict=True):
            r = await client.post(
                f"/api/v1/attempts/{attempt['id']}/items",
                json={"item_key": key, "response": {"choice": choice}},
            )
            assert r.status_code == 200, r.text
        r = await client.post(
            f"/api/v1/attempts/{attempt['id']}/submit",
            headers={"Idempotency-Key": str(uuid.uuid4())},
        )
        assert r.status_code == 200, r.text
    await login(client, "e@example.edu")
    return {"cohort": cohort, "activity_id": str(activity.id), "q1_key": q1_key, "q2_key": q2_key}


async def test_activity_stats_math(client: AsyncClient, db: AsyncSession) -> None:
    ctx = await _quiz_setup(client, db)
    cohort_id, activity_id, q1_key = ctx["cohort"]["id"], ctx["activity_id"], ctx["q1_key"]
    r = await client.get(f"/api/v1/cohorts/{cohort_id}/activities/{activity_id}")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["attempts"] == 2 and body["students_attempted"] == 2
    assert body["pass_rate"] == 50.0
    assert [b["count"] for b in body["distribution"]] == [0, 1, 0, 0, 1]
    q1 = next(i for i in body["items"] if i["key"] == q1_key)
    assert (q1["answered"], q1["correct"]) == (2, 1) and q1["percent_correct"] == 50.0
    assert q1["top_wrong"] == [{"option": "C", "count": 1}]
    # Audited with the cohort id attached.
    row = await db.scalar(select(AuditLog).where(AuditLog.action == "read_activity_stats"))
    assert row is not None and row.cohort_id == uuid.UUID(cohort_id)
    assert row.target_id == uuid.UUID(activity_id)


async def test_activity_stats_404_and_no_audit_for_unknown_activity(
    client: AsyncClient, db: AsyncSession
) -> None:
    ctx = await _quiz_setup(client, db)
    r = await client.get(f"/api/v1/cohorts/{ctx['cohort']['id']}/activities/{uuid.uuid4()}")
    assert r.status_code == 404 and r.json()["title"] == "Activity not found"
    reads = (
        await db.scalars(select(AuditLog).where(AuditLog.action == "read_activity_stats"))
    ).all()
    assert reads == []


async def test_activity_stats_404_and_no_audit_for_draft_activity(
    client: AsyncClient, db: AsyncSession
) -> None:
    """A DRAFT (never-published) activity in the cohort's subject 404s the same as an
    unknown id — #36: exists in the DB but was never published, so has no snapshot."""
    ctx = await _quiz_setup(client, db)
    published = await db.get(Activity, uuid.UUID(ctx["activity_id"]))
    assert published is not None
    draft = Activity(
        kind="quiz", ref_id=uuid.uuid4(), title="Draft Quiz", subject_id=published.subject_id
    )
    db.add(draft)
    await db.flush()
    r = await client.get(f"/api/v1/cohorts/{ctx['cohort']['id']}/activities/{draft.id}")
    assert r.status_code == 404 and r.json()["title"] == "Activity not found"
    reads = (
        await db.scalars(select(AuditLog).where(AuditLog.action == "read_activity_stats"))
    ).all()
    assert reads == []


async def test_other_educator_gets_403(client: AsyncClient, db: AsyncSession) -> None:
    """Same pattern as AT-11: an educator with no enrollment in this cohort gets 403."""
    ctx = await _quiz_setup(client, db)
    await make_educator(client, db, "f@example.edu")
    r = await client.get(f"/api/v1/cohorts/{ctx['cohort']['id']}/activities/{ctx['activity_id']}")
    assert r.status_code == 403
    r = await client.get(f"/api/v1/cohorts/{ctx['cohort']['id']}/outcomes")
    assert r.status_code == 403
    reads = (
        await db.scalars(
            select(AuditLog).where(AuditLog.action.in_(["read_activity_stats", "read_outcomes"]))
        )
    ).all()
    assert reads == []


async def test_outcome_mastery(client: AsyncClient, db: AsyncSession) -> None:
    ctx = await _quiz_setup(client, db)
    r = await client.get(f"/api/v1/cohorts/{ctx['cohort']['id']}/outcomes")
    assert r.status_code == 200, r.text
    rows = {o["code"]: o for o in r.json()["outcomes"]}
    # RB-1 tags q1+q2: 4 answers, 3 correct (A:2, B:1); B is at 50% < threshold 70.
    assert rows["RB-1"]["questions"] == 2
    assert (rows["RB-1"]["answered"], rows["RB-1"]["percent_correct"]) == (4, 75.0)
    assert rows["RB-1"]["students_below_threshold"] == 1
    by_user = {s["display_name"]: s for s in rows["RB-1"]["students"]}
    assert by_user["Student A"]["percent_correct"] == 100.0
    assert by_user["Student B"]["percent_correct"] == 50.0
    # RB-2 tags only q2: both students answered it correctly.
    assert (rows["RB-2"]["answered"], rows["RB-2"]["percent_correct"]) == (2, 100.0)
    assert rows["RB-2"]["students_below_threshold"] == 0
    row = await db.scalar(select(AuditLog).where(AuditLog.action == "read_outcomes"))
    assert row is not None and row.cohort_id == uuid.UUID(ctx["cohort"]["id"])
