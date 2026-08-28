from hypothesis import given
from hypothesis import strategies as st

from app.grading.single_choice import GradeResult, grade_single_choice

options = st.lists(st.text(min_size=1, max_size=40), min_size=2, max_size=10)


@given(options)
def test_matching_choice_is_correct(opts: list[str]) -> None:
    for answer in range(len(opts)):
        r = grade_single_choice({"options": opts, "answer": answer}, {"choice": answer})
        assert r == GradeResult(correct=True, score=1.0, max_score=1.0)


@given(options, st.integers())
def test_non_matching_choice_is_incorrect(opts: list[str], choice: int) -> None:
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
    r = grade_single_choice({"options": ["a", "b"], "answer": 1}, response)
    assert r.correct is False and r.score == 0.0 and r.max_score == 1.0


def test_bool_is_not_an_int_choice() -> None:
    r = grade_single_choice({"options": ["a", "b"], "answer": 1}, {"choice": True})
    assert r.correct is False
