from typing import Any

from app.grading import GradeResult

MAX_SCORE = 1.0


def grade_single_choice(body: dict[str, Any], response: object) -> GradeResult:
    """`body` = {"options": [...], "answer": int}; `response` = {"choice": int}.

    Pure; never raises.
    """
    answer = body.get("answer")
    choice = response.get("choice") if isinstance(response, dict) else None
    correct = (
        isinstance(choice, int)
        and not isinstance(choice, bool)
        and isinstance(answer, int)
        and choice == answer
    )
    return GradeResult(correct=correct, score=MAX_SCORE if correct else 0.0, max_score=MAX_SCORE)
