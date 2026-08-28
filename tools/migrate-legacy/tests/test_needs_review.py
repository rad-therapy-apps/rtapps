"""What this file tests: the four distinct ways `convert_lesson` downgrades a lesson's
`Report.status` to "needs-review" (or, in one case, deliberately does not), each driven
by a small hand-written legacy-HTML fixture rather than a real lesson file.

Used here and why: `tmp_path` (pytest's per-test scratch directory) via the `_write`
helper, so each case gets its own on-disk `index.html` under a fresh subject/lesson
directory — `convert_lesson` reads from a real path, it doesn't accept HTML in memory.

How it fits the project: protects the "needs-review" signal from
`docs/03-architecture.md` §11 that a human uses to know which migrated lessons need a
manual look before publishing; each test pins down exactly which conditions do (and
don't) trigger it, since only two of the several note-producing conditions in
`convert.py` prefix their note with "unsupported element" or "no correct answer" — the
two prefixes `convert_lesson` checks to set the status (see `convert.py`).

Depends on: `migrate_legacy.convert.convert_lesson`.
Used by: `make test-tools` / `uv run pytest` (from `tools/migrate-legacy`); the `tools`
job in `.github/workflows/pr.yml`.
"""

from pathlib import Path

from migrate_legacy.convert import convert_lesson

# A <marquee> inside a lesson page: an element convert.py doesn't know how to map, so it
# falls through to the "unsupported element" note prefix that forces needs-review.
_UNSUPPORTED_ELEMENT_HTML = """
<html><head><title>T</title></head><body>
<div class="container"><h1>T</h1>
<div class="flip-lesson-container">
<div class="lesson-page"><h3>Page 1: One</h3><marquee>hi</marquee></div>
</div></div>
<script>const lessonCorrectAnswers = {};</script>
</body></html>
"""

# A real knowledge-check block (radio inputs present), but `lessonCorrectAnswers` keys
# "other_key" instead of the radio's actual name "q1" — the answer can't be resolved.
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


# An interactive-question-block with plain <label>s but no <input type="radio"> at all —
# there's nothing to key a knowledge check on, so it must fall back to rich_text instead.
_NO_RADIO_INPUTS_HTML = """
<html><head><title>T</title></head><body>
<div class="container"><h1>T</h1>
<div class="flip-lesson-container">
<div class="lesson-page">
<h3>Page 1: One</h3>
<div class="interactive-question-block">
<p class="question-text">Which one?</p>
<label>Yes</label>
<label>No</label>
</div>
</div>
</div></div>
<script>const lessonCorrectAnswers = {};</script>
</body></html>
"""

# A radio `name` ("LQ Page2-1") that isn't already `^[a-z0-9_]+$` — must be normalised to
# "lq_page2_1" and noted, but note this alone does *not* trigger needs-review below.
_UNNORMALISED_KEY_HTML = """
<html><head><title>T</title></head><body>
<div class="container"><h1>T</h1>
<div class="flip-lesson-container">
<div class="lesson-page">
<h3>Page 1: One</h3>
<div class="interactive-question-block">
<p class="question-text">Q?</p>
<label><input type="radio" name="LQ Page2-1" value="A"> Yes</label>
<label><input type="radio" name="LQ Page2-1" value="B"> No</label>
</div>
</div>
</div></div>
<script>const lessonCorrectAnswers = {"LQ Page2-1": "A"};</script>
</body></html>
"""


def _write(tmp_path: Path, name: str, html: str) -> Path:
    """Write one fixture HTML string to its own `<tmp_path>/Subject/<name>/index.html`,
    mirroring the legacy on-disk layout `convert_lesson` expects to walk."""
    lesson_dir = tmp_path / "Subject" / name
    lesson_dir.mkdir(parents=True)
    index_html = lesson_dir / "index.html"
    index_html.write_text(html)
    return index_html


def test_unsupported_element_triggers_needs_review(tmp_path: Path) -> None:
    """An unmapped element (marquee) forces needs-review, is named in the notes, and its
    text still ends up in a rich_text block rather than being silently dropped."""
    index_html = _write(tmp_path, "One", _UNSUPPORTED_ELEMENT_HTML)
    doc, report = convert_lesson(index_html, tmp_path)
    assert report.status == "needs-review"
    assert any(n.startswith("unsupported element marquee") for n in report.notes)
    assert doc["lesson"]["pages"][0]["blocks"][0]["type"] == "rich_text"


def test_missing_correct_answer_triggers_needs_review(tmp_path: Path) -> None:
    """An unresolvable answer key forces needs-review, and the check still imports with
    its answer defaulted to option 0 (a human must fix it, not the pipeline)."""
    index_html = _write(tmp_path, "Two", _MISSING_ANSWER_HTML)
    doc, report = convert_lesson(index_html, tmp_path)
    assert report.status == "needs-review"
    assert "no correct answer for q1" in report.notes
    check = doc["lesson"]["pages"][0]["blocks"][0]
    assert check["type"] == "knowledge_check" and check["answer"] == 0


def test_interactive_block_without_radio_inputs_is_not_a_knowledge_check(tmp_path: Path) -> None:
    """No radio inputs means there's no answer key to build a knowledge_check on, so the
    block falls back to plain rich_text — needs-review, but its question text is kept."""
    index_html = _write(tmp_path, "Three", _NO_RADIO_INPUTS_HTML)
    doc, report = convert_lesson(index_html, tmp_path)
    assert report.status == "needs-review"
    assert any(
        n == "unsupported element interactive-question-block without radio inputs on page 1"
        for n in report.notes
    )
    blocks = doc["lesson"]["pages"][0]["blocks"]
    assert not any(b["type"] == "knowledge_check" for b in blocks)
    rich_text_blocks = [b for b in blocks if b["type"] == "rich_text"]
    assert any(
        "Which one?" in node.get("text", "")
        for b in rich_text_blocks
        for content in b["body"]["content"]
        for node in content.get("content", [])
    )


def test_knowledge_check_key_is_normalised(tmp_path: Path) -> None:
    """A raw radio `name` with spaces/mixed case is normalised to a valid key and the
    change is noted; since the answer still resolves correctly, status stays "converted"
    (this note's prefix, unlike the two above, is not one that forces needs-review)."""
    index_html = _write(tmp_path, "Four", _UNNORMALISED_KEY_HTML)
    doc, report = convert_lesson(index_html, tmp_path)
    check = doc["lesson"]["pages"][0]["blocks"][0]
    assert check["type"] == "knowledge_check"
    assert check["key"] == "lq_page2_1"
    assert "normalised key LQ Page2-1 → lq_page2_1" in report.notes
