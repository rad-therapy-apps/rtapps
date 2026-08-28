"""Grader for the `single_choice` question type (ADR-0003's one implemented question kind).

What this file does: `grade_single_choice` compares a student's chosen option index against
the question body's stored answer index and returns a `GradeResult`.

Used here and why: a plain pure function (no I/O, no ORM) so `app.attempts.router.grade_item`
can call it directly inside a request handler; deliberately defensive about the shape of
untrusted client input (`response`) instead of trusting it's already validated.

How it fits the project: the only grader that exists so far for ADR-0004's grading step;
`app.content.models.QUESTION_TYPES` currently only allows `"single_choice"`, so
`app.attempts.router.grade_item` always resolves here.

Depends on: `app.grading.GradeResult`.
Used by: `app/attempts/router.py` (grade_item); `tests/test_grading_single_choice.py`.
"""

from typing import Any

from app.grading import GradeResult

MAX_SCORE = 1.0


def grade_single_choice(body: dict[str, Any], response: object) -> GradeResult:
    """`body` = {"options": [...], "answer": int}; `response` = {"choice": int}.

    Pure; never raises.
    """
    answer = body.get("answer")
    choice = response.get("choice") if isinstance(response, dict) else None
    # Defensive against untrusted client input: choice must be an actual int (not a bool,
    # which is technically an int subclass in Python) matching an int answer, or it's wrong.
    correct = (
        isinstance(choice, int)
        and not isinstance(choice, bool)
        and isinstance(answer, int)
        and choice == answer
    )
    return GradeResult(correct=correct, score=MAX_SCORE if correct else 0.0, max_score=MAX_SCORE)
