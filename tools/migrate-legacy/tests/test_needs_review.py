from pathlib import Path

from migrate_legacy.convert import convert_lesson

_UNSUPPORTED_ELEMENT_HTML = """
<html><head><title>T</title></head><body>
<div class="container"><h1>T</h1>
<div class="flip-lesson-container">
<div class="lesson-page"><h3>Page 1: One</h3><marquee>hi</marquee></div>
</div></div>
<script>const lessonCorrectAnswers = {};</script>
</body></html>
"""

_MISSING_ANSWER_HTML = """
<html><head><title>T</title></head><body>
<div class="container"><h1>T</h1>
<div class="flip-lesson-container">
<div class="lesson-page">
<h3>Page 1: One</h3>
<div class="interactive-question-block">
<p class="question-text">Q?</p>
<label><input type="radio" name="q1" value="A"> Yes</label>
<label><input type="radio" name="q1" value="B"> No</label>
</div>
</div>
</div></div>
<script>const lessonCorrectAnswers = {"other_key": "A"};</script>
</body></html>
"""


def _write(tmp_path: Path, name: str, html: str) -> Path:
    lesson_dir = tmp_path / "Subject" / name
    lesson_dir.mkdir(parents=True)
    index_html = lesson_dir / "index.html"
    index_html.write_text(html)
    return index_html


def test_unsupported_element_triggers_needs_review(tmp_path: Path) -> None:
    index_html = _write(tmp_path, "One", _UNSUPPORTED_ELEMENT_HTML)
    doc, report = convert_lesson(index_html, tmp_path)
    assert report.status == "needs-review"
    assert any(n.startswith("unsupported element marquee") for n in report.notes)
    assert doc["lesson"]["pages"][0]["blocks"][0]["type"] == "rich_text"


def test_missing_correct_answer_triggers_needs_review(tmp_path: Path) -> None:
    index_html = _write(tmp_path, "Two", _MISSING_ANSWER_HTML)
    doc, report = convert_lesson(index_html, tmp_path)
    assert report.status == "needs-review"
    assert "no correct answer for q1" in report.notes
    check = doc["lesson"]["pages"][0]["blocks"][0]
    assert check["type"] == "knowledge_check" and check["answer"] == 0
