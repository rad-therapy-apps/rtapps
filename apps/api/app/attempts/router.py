"""Routes for the attempt lifecycle: start, per-item grade, submit, and a student's own results.

What this file does: `start_attempt` opens a new attempt against a published activity's
current snapshot (409 if the activity's kind is `calculator` — Task 11: calculators are a
standalone tool, not an attemptable activity); `grade_item` grades one knowledge-check
response and upserts its `AttemptItem`; `submit_attempt` finalises the attempt's score
(idempotently, keyed by the `Idempotency-Key` header); `my_results` lists the caller's own
submitted attempts.

Used here and why: a FastAPI `APIRouter` (mounted without a prefix — paths are
`/activities/{id}/attempts`, `/attempts/{id}/...`, `/me/results`); `_owned_attempt` is a
shared helper every mutating route calls first, so "not mine" and "not found" both 404
identically (never leaking that an attempt id exists for someone else).

How it fits the project: this is the route layer of ADR-0004 — every write here goes
through the one `attempt`/`attempt_item` schema, graded server-side against the exact
`content_version` snapshot pinned at `start_attempt` time, never against the live/edited
lesson.

Depends on: `app.attempts.models`, `app.attempts.rollup`, `app.attempts.schemas`,
`app.auth.deps.require_user`, `app.auth.models` (User, UserRole), `app.content.models`
(Activity, ContentVersion, Lesson), `app.content.activity_snapshots.gradeable_items`,
`app.db.get_session`, `app.errors.Problem`, `app.grading.single_choice.grade_single_choice`.
Used by: `app/main.py` mounts this router; `tests/test_attempts.py`.
"""

import uuid
from datetime import UTC, datetime
from typing import Any, cast

from fastapi import APIRouter, Depends, Header, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.attempts.models import Attempt, AttemptItem
from app.attempts.rollup import upsert_activity_result
from app.attempts.schemas import AttemptOut, ExternalSubmitIn, ItemGradeOut, ItemIn, ResultOut
from app.auth.deps import require_user
from app.auth.models import User, UserRole
from app.content.activity_snapshots import gradeable_items
from app.content.models import Activity, ContentVersion, Lesson
from app.db import get_session
from app.errors import Problem
from app.grading.single_choice import grade_single_choice

router = APIRouter(tags=["attempts"])


async def _owned_attempt(db: AsyncSession, attempt_id: uuid.UUID, user: User) -> Attempt:
    # Row lock: serialises concurrent grade/submit calls on the same attempt so the
    # idempotency check and the item upsert cannot race (released at commit).
    attempt = await db.get(Attempt, attempt_id, with_for_update=True)
    # Ownership check: a real attempt belonging to someone else 404s the same as a missing
    # one, so this endpoint never confirms another user's attempt id exists.
    if attempt is None or attempt.user_id != user.id:
        raise Problem(404, "Attempt not found")
    return attempt


async def _resume_attempt(
    db: AsyncSession, user_id: uuid.UUID, activity_id: uuid.UUID
) -> Attempt | None:
    """The one in_progress attempt for (user, activity), if any — used both for the normal
    resume path and, after a race loss on `uq_attempt_one_in_progress`, to fetch the winner."""
    return cast(
        Attempt | None,
        await db.scalar(
            select(Attempt)
            .where(
                Attempt.user_id == user_id,
                Attempt.activity_id == activity_id,
                Attempt.status == "in_progress",
            )
            .order_by(Attempt.started_at.desc())
            .limit(1)
        ),
    )


@router.post(
    "/activities/{activity_id}/attempts",
    status_code=status.HTTP_201_CREATED,
    response_model=AttemptOut,
)
async def start_attempt(
    activity_id: uuid.UUID,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_session),
) -> Attempt:
    activity = await db.get(Activity, activity_id)
    # Unpublished (or never-published) activities aren't attemptable; 404 either way rather
    # than distinguishing "doesn't exist" from "not published yet".
    if activity is None or activity.current_version_id is None or activity.status != "published":
        raise Problem(404, "Activity not found")
    # Task 11: a calculator has no gradeable items or completion state — it's a standalone
    # tool (Task 17's MU player), never a thing a student "attempts".
    if activity.kind == "calculator":
        raise Problem(409, "Calculators are not attemptable")
    # ADR-0006: students cannot start attempts on assessment activities (same 404).
    if activity.access != "practice" and user.role == UserRole.student:
        raise Problem(404, "Activity not found")
    # Resume: one in-progress attempt per (user, activity) — return it with its saved
    # items instead of stacking a duplicate (FR: attempt resume).
    existing = await _resume_attempt(db, user.id, activity.id)
    if existing is not None:
        return existing
    # Pin content_version_id now: this is the ADR-0004 guarantee that later edits/republishes
    # of the lesson can never change what this attempt is graded against.
    attempt = Attempt(
        user_id=user.id,
        activity_id=activity.id,
        content_version_id=activity.current_version_id,
    )
    try:
        # Savepoint around just the insert: `db.add` must happen *inside* the nested
        # transaction (begin_nested's own autoflush would otherwise flush the pending
        # insert before the savepoint even exists). The partial unique index
        # uq_attempt_one_in_progress (Task 6) is the arbiter for two concurrent starts, and
        # a race loser must recover without aborting the whole request's transaction.
        async with db.begin_nested():
            db.add(attempt)
            await db.flush()
    except IntegrityError:
        # Lost the race: someone else's in_progress attempt already exists. The savepoint
        # rollback above already expunged our never-persisted row; return the winner via
        # the same resume path (same response shape, including items) instead of a 500.
        winner = await _resume_attempt(db, user.id, activity.id)
        assert winner is not None
        return winner
    await db.commit()
    await db.refresh(attempt)
    return attempt


@router.post("/attempts/{attempt_id}/items", response_model=ItemGradeOut)
async def grade_item(
    attempt_id: uuid.UUID,
    body: ItemIn,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    attempt = await _owned_attempt(db, attempt_id, user)
    if attempt.status != "in_progress":
        raise Problem(409, "Attempt already submitted")
    # Read the pinned snapshot (not the live/edited lesson) so grading matches what the
    # student actually saw, even if the author has since republished.
    version = await db.get(ContentVersion, attempt.content_version_id)
    assert version is not None
    block = gradeable_items(version.snapshot).get(body.item_key)
    if block is None:
        raise Problem(404, "Unknown item key")
    # Grading always runs server-side, against the snapshot's stored answer key — the
    # client only ever sends its chosen response, never the answer.
    result = grade_single_choice(block["body"], body.response)
    # Upsert on (attempt_id, item_key): re-answering the same question updates the existing
    # row instead of inserting a duplicate (see the unique constraint on AttemptItem).
    item = next((i for i in attempt.items if i.item_key == body.item_key), None)
    if item is None:
        item = AttemptItem(attempt_id=attempt.id, item_key=body.item_key, response=body.response)
        db.add(item)
    item.response = body.response
    item.correct = result.correct
    item.score = result.score
    item.max_score = result.max_score
    item.graded_at = datetime.now(UTC)
    await db.commit()
    return {
        "item_key": body.item_key,
        "correct": result.correct,
        "score": result.score,
        "max_score": result.max_score,
        "explanation": block.get("explanation"),
    }


@router.post("/attempts/{attempt_id}/submit", response_model=AttemptOut)
async def submit_attempt(
    attempt_id: uuid.UUID,
    payload: ExternalSubmitIn | None = None,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_session),
) -> Attempt:
    if not idempotency_key:
        raise Problem(400, "Idempotency-Key header is required")
    attempt = await _owned_attempt(db, attempt_id, user)
    # Idempotent replay: a retried submit with the same key returns the original result
    # instead of re-grading (protects against double-submit on flaky student wifi); a
    # different key on an already-submitted attempt is a genuine conflict, not a retry.
    if attempt.status == "submitted":
        if attempt.idempotency_key == idempotency_key:
            return attempt
        raise Problem(409, "Attempt already submitted")
    if attempt.status != "in_progress":
        raise Problem(409, f"Attempt is {attempt.status}")
    version = await db.get(ContentVersion, attempt.content_version_id)
    assert version is not None
    kind = version.snapshot["activity"]["kind"]
    if kind != "external" and payload is not None:
        raise Problem(422, "A score payload is only valid for external activities")
    if kind == "external":
        # Plan 4a: the game's client-reported score. Server-authoritative max from the
        # PINNED snapshot config; clamp so a tampered client caps out at 100%.
        if payload is None:
            raise Problem(422, "External activities require a score payload")
        max_score = float(version.snapshot["activity"]["config"].get("max_score") or 0)
        if max_score <= 0:
            raise Problem(422, "Activity has no max_score configured")
        score = min(payload.score, max_score)
        attempt.score = score
        attempt.max_score = max_score
        attempt.percent = round(100.0 * score / max_score, 2)
        attempt.passed = None  # practice: no pass mark for games in 4a
    elif kind == "flashcards":
        # Completion-only: no score fields at all (max_score 0 must not fake percent=100).
        attempt.score = attempt.max_score = attempt.percent = None
        attempt.passed = None
    else:
        # Sum only the pinned snapshot's own gradeable items; an item answered under a
        # different (older) snapshot key wouldn't match here and is simply excluded.
        items = gradeable_items(version.snapshot)
        scored = {i.item_key: i.score or 0.0 for i in attempt.items}
        score = sum(scored.get(key, 0.0) for key in items)
        max_score = float(len(items))
        percent = round(100.0 * score / max_score, 2) if max_score else 100.0
        pass_percent = float(version.snapshot["activity"]["config"].get("pass_percent", 80))
        attempt.score = score
        attempt.max_score = max_score
        attempt.percent = percent
        attempt.passed = percent >= pass_percent
    now = datetime.now(UTC)
    attempt.status = "submitted"
    attempt.submitted_at = now
    attempt.idempotency_key = idempotency_key
    attempt.duration_s = int((now - attempt.started_at).total_seconds())
    await db.flush()  # make the submitted status visible to the rollup query
    await upsert_activity_result(db, attempt)  # FR-X-02: rollup lands in the same transaction
    await db.commit()
    await db.refresh(attempt)
    return attempt


@router.get("/me/results", response_model=list[ResultOut])
async def my_results(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_session),
) -> list[dict[str, Any]]:
    # Joined read (not attempt.activity_id alone) so the response can include the
    # activity's title and lesson slug without a second round trip per row.
    rows = await db.execute(
        select(Attempt, Activity.title, Lesson.slug)
        .join(Activity, Activity.id == Attempt.activity_id)
        .outerjoin(Lesson, Lesson.id == Activity.lesson_id)
        .where(Attempt.user_id == user.id, Attempt.status == "submitted")
        .order_by(Attempt.submitted_at.desc())
        .limit(50)
    )
    return [
        {
            "attempt_id": a.id,
            "activity_id": a.activity_id,
            "activity_title": title,
            "lesson_slug": slug,
            "percent": a.percent,
            "passed": a.passed,
            "score": a.score,
            "max_score": a.max_score,
            "submitted_at": a.submitted_at,
        }
        for a, title, slug in rows.all()
    ]
