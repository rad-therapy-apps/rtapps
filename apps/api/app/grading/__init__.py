"""Package for server-side grading, plus the shared `GradeResult` shape.

What this file does: `GradeResult` is the one return type every question-type grader
(currently just `app.grading.single_choice`) produces, so `app.attempts.router` has a
single shape to read regardless of question type.

Used here and why: a frozen `dataclass` — graders are pure functions with no ORM/Pydantic
involvement, so a plain immutable value type is enough; frozen prevents a caller from
accidentally mutating a grading result after the fact.

How it fits the project: this is the grading half of ADR-0004 — answer keys never leave
the server, and a grader's only output is this correct/score/max_score triple, added into
`AttemptItem` by `app.attempts.router.grade_item`.

Depends on: nothing.
Used by: `app.grading.single_choice` (returns it); `app.attempts.router` (reads it);
`tests/test_grading_single_choice.py`.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class GradeResult:
    correct: bool
    score: float
    max_score: float
