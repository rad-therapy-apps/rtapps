"""What this file tests: `app/grading/single_choice.grade_single_choice` — the pure
scoring function for single-choice knowledge checks.

Used here and why: hypothesis property tests, because grading must hold for every input
the attempts router can pass it (any options list, any answer index, and arbitrarily
malformed submitted responses) — not just the couple of examples a hand-written test would
pick. Plain example-based tests cover a specific edge case (bool vs int) that a property
alone wouldn't obviously target.

How it fits the project: protects ADR-0004 (unified attempt/result schema) — grading must
never raise, since `app.attempts.router.grade_item` calls it directly inside a request
handler with a student-controlled response body.

Works with: hypothesis.
Depends on: `app.grading.single_choice`.
Used by: CI `api` job in `.github/workflows/pr.yml`; `make test-api`.
"""

from hypothesis import given
from hypothesis import strategies as st

from app.grading.single_choice import GradeResult, grade_single_choice

# 2-10 non-empty option strings — matches KnowledgeCheckImport's min/max_length constraints.
options = st.lists(st.text(min_size=1, max_size=40), min_size=2, max_size=10)


@given(options)
def test_matching_choice_is_correct(opts: list[str]) -> None:
    """Every valid answer index, submitted as the matching choice, scores full marks."""
    for answer in range(len(opts)):
        r = grade_single_choice({"options": opts, "answer": answer}, {"choice": answer})
        assert r == GradeResult(correct=True, score=1.0, max_score=1.0)


@given(options, st.integers())
def test_non_matching_choice_is_incorrect(opts: list[str], choice: int) -> None:
    """Any submitted choice (including out-of-range or negative ints) is correct iff it
    equals the answer index; nothing else about max_score/score depends on the choice."""
    answer = 0
    r = grade_single_choice({"options": opts, "answer": answer}, {"choice": choice})
    assert r.correct is (choice == answer) and r.max_score == 1.0
    assert r.score == (1.0 if r.correct else 0.0)


@given(
    st.one_of(
        st.none(),
        st.text(),
        st.integers(),
        st.lists(st.integers()),
        st.dictionaries(st.text(), st.text()),
    )
)
def test_malformed_response_never_raises(response: object) -> None:
    """A response that isn't a well-formed {"choice": int} dict (wrong type, wrong shape, or
    missing entirely) is graded as incorrect rather than raising — grading must never crash
    a request no matter what a client submits."""
    r = grade_single_choice({"options": ["a", "b"], "answer": 1}, response)
    assert r.correct is False and r.score == 0.0 and r.max_score == 1.0


def test_bool_is_not_an_int_choice() -> None:
    """bool is a subclass of int in Python; grade_single_choice explicitly excludes it so
    {"choice": True} can't accidentally match answer index 1."""
    r = grade_single_choice({"options": ["a", "b"], "answer": 1}, {"choice": True})
    assert r.correct is False
