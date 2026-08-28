import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, Header, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.attempts.models import Attempt, AttemptItem
from app.attempts.schemas import AttemptOut, ItemGradeOut, ItemIn, ResultOut
from app.auth.deps import require_user
from app.auth.models import User
from app.content.models import Activity, ContentVersion, Lesson
from app.content.snapshot import knowledge_checks
from app.db import get_session
from app.errors import Problem
from app.grading.single_choice import grade_single_choice

router = APIRouter(tags=["attempts"])


async def _owned_attempt(db: AsyncSession, attempt_id: uuid.UUID, user: User) -> Attempt:
    attempt = await db.get(Attempt, attempt_id)
    if attempt is None or attempt.user_id != user.id:
        raise Problem(404, "Attempt not found")
    return attempt


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
    if activity is None or activity.current_version_id is None or activity.status != "published":
        raise Problem(404, "Activity not found")
    attempt = Attempt(
        user_id=user.id,
        activity_id=activity.id,
        content_version_id=activity.current_version_id,
    )
    db.add(attempt)
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
    version = await db.get(ContentVersion, attempt.content_version_id)
    assert version is not None
    block = knowledge_checks(version.snapshot).get(body.item_key)
    if block is None:
        raise Problem(404, "Unknown item key")
    result = grade_single_choice(block["body"], body.response)
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
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_session),
) -> Attempt:
    if not idempotency_key:
        raise Problem(400, "Idempotency-Key header is required")
    attempt = await _owned_attempt(db, attempt_id, user)
    if attempt.status == "submitted":
        if attempt.idempotency_key == idempotency_key:
            return attempt
        raise Problem(409, "Attempt already submitted")
    version = await db.get(ContentVersion, attempt.content_version_id)
    assert version is not None
    checks = knowledge_checks(version.snapshot)
    scored = {i.item_key: i.score or 0.0 for i in attempt.items}
    score = sum(scored.get(key, 0.0) for key in checks)
    max_score = float(len(checks))
    percent = round(100.0 * score / max_score, 2) if max_score else 100.0
    pass_percent = float(version.snapshot["activity"]["config"].get("pass_percent", 80))
    now = datetime.now(UTC)
    attempt.score = score
    attempt.max_score = max_score
    attempt.percent = percent
    attempt.passed = percent >= pass_percent
    attempt.status = "submitted"
    attempt.submitted_at = now
    attempt.idempotency_key = idempotency_key
    attempt.duration_s = int((now - attempt.started_at).total_seconds())
    await db.commit()
    await db.refresh(attempt)
    return attempt


@router.get("/me/results", response_model=list[ResultOut])
async def my_results(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_session),
) -> list[dict[str, Any]]:
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
