"""Tests for the answer-key recovery variants in convert.py.

What this file does: pins the three legacy answer encodings (lessonCorrectAnswers,
correctAnswers-without-_ans-suffix, checkPageAnswer onclick args) so a converter change
can't silently regress any of them, and pins that harvested check buttons are dropped.
Used here and why: pure-function tests over small HTML fragments via convert._convert,
matching the style of test_convert.py.
How it fits the project: plan 3b Task 1 — shrinks the "no correct answer" needs-review family.
Works with: migrate_legacy.convert.
"""

from migrate_legacy.convert import _convert


def _lesson_html(script: str, button: str = "") -> str:
    return f"""
    <div class="container"><div class="flip-lesson-container">
      <div class="lesson-page">
        <h3>Page 1: Terminology</h3>
        <div class="interactive-question-block" id="q_page1_1">
          <p class="question-text">Where is the hypogastric region?</p>
          <label><input type="radio" name="q_page1_1_ans" value="A"> Above the stomach</label>
          <label><input type="radio" name="q_page1_1_ans" value="B"> Below the stomach</label>
          {button}
        </div>
      </div>
    </div></div>
    <script>{script}</script>
    """


def _first_check(doc):
    for block in doc["pages"][0]["blocks"]:
        if block["type"] == "knowledge_check":
            return block
    raise AssertionError("no knowledge_check block produced")


def test_lesson_correct_answers_still_resolves():
    notes: list[str] = []
    doc = _convert(_lesson_html("const lessonCorrectAnswers = {'q_page1_1_ans': 'B'};"), notes)
    assert _first_check(doc)["answer"] == 1
    assert not any(n.startswith("no correct answer") for n in notes)


def test_correct_answers_variant_without_ans_suffix_resolves():
    notes: list[str] = []
    doc = _convert(_lesson_html("const correctAnswers = {'q_page1_1': 'B'};"), notes)
    assert _first_check(doc)["answer"] == 1
    assert not any(n.startswith("no correct answer") for n in notes)


def test_check_page_answer_onclick_resolves_and_button_dropped():
    notes: list[str] = []
    button = "<button onclick=\"checkPageAnswer('q_page1_1', 'B')\">Check Answer</button>"
    doc = _convert(_lesson_html("", button=button), notes)
    assert _first_check(doc)["answer"] == 1
    assert not any(n.startswith("no correct answer") for n in notes)
    # The harvested check button must not surface as an unsupported element.
    assert not any("button" in n for n in notes)


def test_unresolvable_answer_still_flags():
    notes: list[str] = []
    doc = _convert(_lesson_html("const correctAnswers = {'q_other': 'B'};"), notes)
    assert _first_check(doc)["answer"] == 0
    assert any(n.startswith("no correct answer") for n in notes)
