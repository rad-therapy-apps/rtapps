"""What this file tests: CSV export routes `GET /cohorts/{id}/overview.csv`,
`GET /cohorts/{id}/activities/{aid}.csv`, and `GET /cohorts/{id}/outcomes.csv` in
`app.analytics.router` — content-type, headers, exact column contracts, row counts,
data matching the JSON views, audit rows, and authorization (owner 200 and audited;
non-owner educator 403 and not audited).

Used here and why: TDD — tests define the exact CSV shapes and audit requirements before
implementing the routes and csv_response function.

How it fits the project: FR-E-08 — CSV export for educator views.

Works with: pytest-asyncio, httpx, csv module.

Depends on: `client`, `db` (conftest); `_setup`, `_complete` from `tests/test_analytics.py`;
`app.audit.models.AuditLog`.

Used by: CI `api` job; `make test-api`.
"""

import csv
import io
import uuid

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.csv_export import csv_response
from app.audit.models import AuditLog
from app.content.activity_importer import import_any
from app.content.models import Activity, ContentVersion
from tests.conftest import register
from tests.test_activity_importer import QUIZ_DOC
from tests.test_analytics import _setup
from tests.test_cohorts import create_cohort, login, make_educator


async def test_csv_response_quoting() -> None:
    """csv.writer round trip: a name with commas and quotes survives as-is."""
    header = ["name", "value"]
    rows = [['"Joe", Jr.', 42], ["Jane", 43]]
    resp = csv_response("test.csv", header, rows)
    # Parse the response content as CSV.
    reader = csv.reader(io.StringIO(resp.body.decode("utf-8")))
    parsed = list(reader)
    assert parsed[0] == header
    assert parsed[1] == ['"Joe", Jr.', "42"]
    assert parsed[2] == ["Jane", "43"]
    # Verify response headers.
    assert resp.headers["content-type"] == "text/csv; charset=utf-8"
    assert resp.headers["content-disposition"] == 'attachment; filename="test.csv"'


async def test_overview_csv_columns_and_data(client: AsyncClient, db: AsyncSession) -> None:
    """GET /cohorts/{id}/overview.csv: header, row count, one row match JSON view."""
    ctx = await _setup(client, db)
    r = await client.get(f"/api/v1/cohorts/{ctx['cohort']['id']}/overview.csv")
    assert r.status_code == 200, r.text
    assert r.headers["content-type"].startswith("text/csv")
    # Parse CSV.
    reader = csv.DictReader(io.StringIO(r.text))
    rows = list(reader)
    # Header.
    assert reader.fieldnames == [
        "display_name",
        "email",
        "attempted",
        "passed",
        "mean_best_percent",
    ]
    # Two students.
    assert len(rows) == 2
    # One spot check: student a@example.edu (100%, 1/1).
    a_row = next(r for r in rows if r["email"] == "a@example.edu")
    assert a_row["display_name"] == "A"  # registered with name=first_letter
    assert a_row["attempted"] == "1"
    assert a_row["passed"] == "1"
    assert a_row["mean_best_percent"] == "100.0"
    # Audit row.
    audit = await db.scalar(
        select(AuditLog).where(
            AuditLog.action == "export_csv",
            AuditLog.detail["view"].astext == "overview",
        )
    )
    assert audit is not None and audit.cohort_id == uuid.UUID(ctx["cohort"]["id"])


async def test_overview_csv_non_owner_403(client: AsyncClient, db: AsyncSession) -> None:
    """Non-owner educator gets 403, no audit row."""
    ctx = await _setup(client, db)
    await make_educator(client, db, "other-edu@example.edu")
    r = await client.get(f"/api/v1/cohorts/{ctx['cohort']['id']}/overview.csv")
    assert r.status_code == 403
    # No audit row.
    audits = await db.scalars(select(AuditLog).where(AuditLog.action == "export_csv"))
    assert len(audits.all()) == 0


async def test_activity_csv_columns_and_data(client: AsyncClient, db: AsyncSession) -> None:
    """GET /cohorts/{id}/activities/{aid}.csv: header, row count, one item row."""
    # Use quiz setup for consistent items.
    activity = await import_any(db, QUIZ_DOC)
    version = await db.get(ContentVersion, activity.current_version_id)
    assert version is not None
    q1_key, q2_key = (q["key"] for q in version.snapshot["quiz"]["questions"])
    await make_educator(client, db, "e@example.edu")
    cohort = await create_cohort(client, "C")
    for email, name, choices in (
        ("a@example.edu", "Student A", (0, 1)),  # both correct
        ("b@example.edu", "Student B", (2, 1)),  # q1 wrong, q2 right
    ):
        await register(client, email=email, name=name)
        assert (
            await client.post("/api/v1/cohorts/join", json={"code": cohort["join_code"]})
        ).status_code == 200
        attempt = (await client.post(f"/api/v1/activities/{activity.id}/attempts")).json()
        for key, choice in zip((q1_key, q2_key), choices, strict=True):
            await client.post(
                f"/api/v1/attempts/{attempt['id']}/items",
                json={"item_key": key, "response": {"choice": choice}},
            )
        await client.post(
            f"/api/v1/attempts/{attempt['id']}/submit",
            headers={"Idempotency-Key": str(uuid.uuid4())},
        )
    await login(client, "e@example.edu")
    r = await client.get(f"/api/v1/cohorts/{cohort['id']}/activities/{activity.id}.csv")
    assert r.status_code == 200, r.text
    assert r.headers["content-type"].startswith("text/csv")
    # Parse CSV.
    reader = csv.DictReader(io.StringIO(r.text))
    rows = list(reader)
    # Header.
    assert reader.fieldnames == ["item", "label", "answered", "correct", "percent_correct"]
    # Two items (q1, q2).
    assert len(rows) == 2
    # One spot check: q1 (answered=2, correct=1, 50%).
    q1_row = next(r for r in rows if r["item"] == q1_key)
    assert q1_row["label"]  # non-empty label
    assert q1_row["answered"] == "2"
    assert q1_row["correct"] == "1"
    assert q1_row["percent_correct"] == "50.0"
    # Audit row with activity_id.
    audit = await db.scalar(
        select(AuditLog).where(
            AuditLog.action == "export_csv",
            AuditLog.detail["view"].astext == "activity",
        )
    )
    assert audit is not None
    assert audit.detail["activity_id"] == str(activity.id)
    assert audit.cohort_id == uuid.UUID(cohort["id"])


async def test_activity_csv_404_no_audit_unpublished(client: AsyncClient, db: AsyncSession) -> None:
    """GET /cohorts/{id}/activities/{bad_id}.csv: 404, no audit."""
    ctx = await _setup(client, db)
    r = await client.get(f"/api/v1/cohorts/{ctx['cohort']['id']}/activities/{uuid.uuid4()}.csv")
    assert r.status_code == 404
    audits = await db.scalars(select(AuditLog).where(AuditLog.action == "export_csv"))
    assert len(audits.all()) == 0


async def test_activity_csv_404_and_no_audit_for_draft_activity(
    client: AsyncClient, db: AsyncSession
) -> None:
    """A DRAFT (never-published) activity in the cohort's subject 404s the same as an
    unknown id — #36: exists in the DB but was never published, so has no snapshot."""
    ctx = await _setup(client, db)
    published = await db.get(Activity, uuid.UUID(ctx["aid"]))
    assert published is not None
    draft = Activity(
        kind="quiz", ref_id=uuid.uuid4(), title="Draft Quiz", subject_id=published.subject_id
    )
    db.add(draft)
    await db.flush()
    r = await client.get(f"/api/v1/cohorts/{ctx['cohort']['id']}/activities/{draft.id}.csv")
    assert r.status_code == 404
    audits = await db.scalars(select(AuditLog).where(AuditLog.action == "export_csv"))
    assert len(audits.all()) == 0


async def test_activity_csv_non_owner_403(client: AsyncClient, db: AsyncSession) -> None:
    """Non-owner educator gets 403, no audit row."""
    activity = await import_any(db, QUIZ_DOC)
    await make_educator(client, db, "edu1@example.edu")
    cohort = await create_cohort(client, "C")
    await make_educator(client, db, "edu2@example.edu")
    r = await client.get(f"/api/v1/cohorts/{cohort['id']}/activities/{activity.id}.csv")
    assert r.status_code == 403
    audits = await db.scalars(select(AuditLog).where(AuditLog.action == "export_csv"))
    assert len(audits.all()) == 0


async def test_outcomes_csv_columns_and_data(client: AsyncClient, db: AsyncSession) -> None:
    """GET /cohorts/{id}/outcomes.csv: header, row count, one outcome row."""
    # Use quiz setup with outcomes RB-1, RB-2.
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
            await client.post(
                f"/api/v1/attempts/{attempt['id']}/items",
                json={"item_key": key, "response": {"choice": choice}},
            )
        await client.post(
            f"/api/v1/attempts/{attempt['id']}/submit",
            headers={"Idempotency-Key": str(uuid.uuid4())},
        )
    await login(client, "e@example.edu")
    r = await client.get(f"/api/v1/cohorts/{cohort['id']}/outcomes.csv")
    assert r.status_code == 200, r.text
    assert r.headers["content-type"].startswith("text/csv")
    # Parse CSV.
    reader = csv.DictReader(io.StringIO(r.text))
    rows = list(reader)
    # Header.
    assert reader.fieldnames == [
        "outcome",
        "title",
        "questions",
        "answered",
        "percent_correct",
        "students_below_threshold",
    ]
    # Two outcomes (RB-1, RB-2).
    assert len(rows) == 2
    # One spot check: RB-1 (questions=2, answered=4, 75%, below_threshold=1).
    rb1_row = next(r for r in rows if r["outcome"] == "RB-1")
    assert rb1_row["title"]  # non-empty title
    assert rb1_row["questions"] == "2"
    assert rb1_row["answered"] == "4"
    assert rb1_row["percent_correct"] == "75.0"
    assert rb1_row["students_below_threshold"] == "1"
    # Audit row.
    audit = await db.scalar(
        select(AuditLog).where(
            AuditLog.action == "export_csv",
            AuditLog.detail["view"].astext == "outcomes",
        )
    )
    assert audit is not None and audit.cohort_id == uuid.UUID(cohort["id"])


async def test_outcomes_csv_non_owner_403(client: AsyncClient, db: AsyncSession) -> None:
    """Non-owner educator gets 403, no audit row."""
    await import_any(db, QUIZ_DOC)
    await make_educator(client, db, "edu3@example.edu")
    cohort = await create_cohort(client, "C")
    await make_educator(client, db, "edu4@example.edu")
    r = await client.get(f"/api/v1/cohorts/{cohort['id']}/outcomes.csv")
    assert r.status_code == 403
    audits = await db.scalars(select(AuditLog).where(AuditLog.action == "export_csv"))
    assert len(audits.all()) == 0
