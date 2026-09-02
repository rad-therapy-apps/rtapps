"""What this file tests: `migrate_legacy.convert.convert_lesson` end to end, against two
real legacy lesson fixtures copied under tests/fixtures/ — the full pipeline
`test_html2prose.py`'s fragment-level tests build up to.

Used here and why: byte-for-byte comparison against a checked-in golden JSON file per
fixture, so any change to the mapping rules (intentional or not) shows up as a diff
against `tests/golden/{slug}.json` instead of a vague assertion failure; a second,
independent pass re-validates every prose document the converter produced against the
real `packages/schemas/prose-doc.schema.json` (jsonschema `Draft202012Validator`), since
a golden file matching doesn't by itself prove the golden file is schema-valid.

How it fits the project: this is the "does the migration tool actually work" test for
`docs/03-architecture.md` §11 — the goldens are two real legacy lessons, not synthetic
fragments, so a passing suite here is the confidence signal for running the tool over
the whole legacy content library. Note: per the ruff `extend-exclude` entry in
`pyproject.toml`, this file is copied verbatim from the task brief and intentionally
left un-reflowed — the long lines below are as-shipped, not an oversight.

Depends on: `migrate_legacy.convert`; tests/fixtures/{Radiation_Biology,Radiation_Physics}/...;
tests/golden/*.json; packages/schemas/prose-doc.schema.json.
Used by: `make test-tools` / `uv run pytest` (from `tools/migrate-legacy`); the `tools`
job in `.github/workflows/pr.yml`.

Test list: test_golden (parametrized), test_every_prose_doc_validates (parametrized),
test_rbe_specifics, test_not_a_paged_lesson_is_unsupported, test_correct_answers_pyjson5_literals,
test_duplicate_html_documents_deduped.
"""

import json
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator

from migrate_legacy.convert import convert_lesson

HERE = Path(__file__).parent
FIXTURES = HERE / "fixtures"
SCHEMA = json.loads((HERE.parents[2] / "packages/schemas/prose-doc.schema.json").read_text())
CASES = [("Radiation_Biology/RBE_and_OER", "rbe-and-oer"), ("Radiation_Physics/em_spectrum", "em-spectrum")]


@pytest.mark.parametrize(("rel", "slug"), CASES)
def test_golden(rel: str, slug: str) -> None:
    # Full end-to-end conversion must match the checked-in golden exactly, and the
    # conversion must be reported "converted" (not "needs-review") — these two fixtures
    # are meant to be clean, lossless conversions of real legacy content.
    doc, report = convert_lesson(FIXTURES / rel / "index.html", FIXTURES)
    expected = json.loads((HERE / "golden" / f"{slug}.json").read_text())
    assert doc == expected
    assert report.status == "converted", report.notes


@pytest.mark.parametrize(("rel", "slug"), CASES)
def test_every_prose_doc_validates(rel: str, slug: str) -> None:
    # Belt-and-suspenders check independent of the golden-file comparison: every
    # rich_text body and every knowledge_check stem/explanation must itself be a valid
    # document under the real schema, catching schema drift the golden alone wouldn't.
    doc, _ = convert_lesson(FIXTURES / rel / "index.html", FIXTURES)
    v = Draft202012Validator(SCHEMA)
    for page in doc["lesson"]["pages"]:
        for block in page["blocks"]:
            for prose in ([block["body"]] if block["type"] == "rich_text" else [block["stem"], block["explanation"]]):
                if prose is not None:
                    v.validate(prose)


def test_rbe_specifics() -> None:
    # Pinned, human-readable spot checks on top of the golden comparison: subject/lesson
    # metadata, page order, and both knowledge checks' keys/answers/options/explanation
    # text survive the conversion correctly, not just "matches some golden blob".
    doc, _ = convert_lesson(FIXTURES / "Radiation_Biology/RBE_and_OER/index.html", FIXTURES)
    assert doc["subject"] == {"slug": "radiation-biology", "title": "Radiation Biology", "order": 0}
    assert doc["lesson"]["slug"] == "rbe-and-oer" and doc["lesson"]["title"] == "RBE and OER"
    assert [p["title"] for p in doc["lesson"]["pages"]][:2] == ["Not All Radiation Damages Equally", "Relative Biologic Effectiveness (RBE)"]
    checks = [b for p in doc["lesson"]["pages"] for b in p["blocks"] if b["type"] == "knowledge_check"]
    assert [(c["key"], c["answer"]) for c in checks] == [("lq_page2_1", 1), ("lq_page5_1", 0)]
    assert checks[0]["options"] == ["RBE keeps increasing without limit", "RBE actually decreases past that point"]
    assert checks[0]["explanation"]["content"][0]["content"][0]["text"].startswith("Past the optimal LET")


def test_not_a_paged_lesson_is_unsupported(tmp_path: Path) -> None:
    # A document with no div.lesson-page at all isn't the pattern this tool handles;
    # convert_lesson must report "unsupported" and return an empty doc rather than
    # guessing at a partial conversion.
    (tmp_path / "X").mkdir()
    (tmp_path / "X/index.html").write_text("<html><body><h1>Quiz</h1></body></html>")
    doc, report = convert_lesson(tmp_path / "X/index.html", tmp_path)
    assert report.status == "unsupported" and doc == {}


def test_correct_answers_pyjson5_literals(tmp_path: Path) -> None:
    # Commit cd7100d changed _correct_answers to use pyjson5.decode instead of
    # json.loads, tolerating JS object-literal syntax: single quotes, unquoted keys,
    # and // comments. Verify that a knowledge_check with such a lessonCorrectAnswers
    # object still resolves its answer correctly (answer index set, no parse error note).
    html = """<html>
<head><title>Test</title></head>
<body>
<div class="flip-lesson-container">
<script>
const lessonCorrectAnswers = {
    'lq_page1_1': 'B',  // Second option is correct
    lq_page1_2: 'A'
};
</script>
<div id="lesson-page-1" class="lesson-page">
<h3>Page 1: Test Page</h3>
<p>Some introductory text.</p>
<h4>Quick Check!</h4>
<div class="interactive-question-block">
    <p class="question-text">What is the correct answer?</p>
    <label><input type="radio" name="lq_page1_1" value="A"> Option A</label>
    <label><input type="radio" name="lq_page1_1" value="B"> Option B</label>
    <div class="explanation">Option B is correct.</div>
</div>
</div>
</div>
</body>
</html>"""
    (tmp_path / "Y").mkdir()
    (tmp_path / "Y/index.html").write_text(html)
    doc, report = convert_lesson(tmp_path / "Y/index.html", tmp_path)

    # The conversion must succeed (status "converted" or "needs-review" is ok)
    assert doc != {}, "Conversion should produce a doc"
    # Verify no parse-error note was added (pyjson5 successfully parsed the object)
    assert not any("unparseable lessonCorrectAnswers" in note for note in report.notes), \
        f"Should not have unparseable note; got notes: {report.notes}"
    # Verify the knowledge_check key exists and answer is resolved to index 1 (Option B)
    checks = [b for p in doc.get("lesson", {}).get("pages", []) for b in p.get("blocks", []) if b.get("type") == "knowledge_check"]
    assert len(checks) > 0, "Should have at least one knowledge_check"
    # The check's answer should be 1 (Option B is at index 1, matching lessonCorrectAnswers)
    assert checks[0].get("answer") == 1, f"Answer should be index 1 for Option B, got {checks[0].get('answer')}"


def test_duplicate_html_documents_deduped(tmp_path: Path) -> None:
    # Commit cd7100d added logic to detect and drop duplicate lesson pages that arise
    # when legacy files concatenate two whole HTML documents (a source authoring bug).
    # The parser walks past </html> and picks up both documents' pages, so identical
    # pages appear twice. Verify that duplicates are dropped and a note is added.
    html = """<html>
<head><title>Test</title></head>
<body>
<div class="flip-lesson-container">
<div id="lesson-page-1" class="lesson-page">
<h3>Page 1: Identical Content</h3>
<p>This page has identical content in both documents.</p>
<h4>Quick Check!</h4>
<div class="interactive-question-block">
    <p class="question-text">Which option is correct?</p>
    <label><input type="radio" name="q1" value="A"> Option A</label>
    <label><input type="radio" name="q1" value="B"> Option B</label>
    <div class="explanation">Option A is the answer.</div>
</div>
</div>
</div>
</body>
</html>
<html>
<head><title>Test</title></head>
<body>
<div class="flip-lesson-container">
<div id="lesson-page-1" class="lesson-page">
<h3>Page 1: Identical Content</h3>
<p>This page has identical content in both documents.</p>
<h4>Quick Check!</h4>
<div class="interactive-question-block">
    <p class="question-text">Which option is correct?</p>
    <label><input type="radio" name="q1" value="A"> Option A</label>
    <label><input type="radio" name="q1" value="B"> Option B</label>
    <div class="explanation">Option A is the answer.</div>
</div>
</div>
</div>
</body>
</html>"""
    (tmp_path / "Z").mkdir()
    (tmp_path / "Z/index.html").write_text(html)
    doc, report = convert_lesson(tmp_path / "Z/index.html", tmp_path)

    # The conversion must succeed
    assert doc != {}, "Conversion should produce a doc"
    # Verify exactly one page in the result (the duplicate was dropped)
    pages = doc.get("lesson", {}).get("pages", [])
    assert len(pages) == 1, f"Should have 1 page after dedup, got {len(pages)}"
    # Verify the dedup note was added
    assert any("duplicate lesson page dropped" in note for note in report.notes), \
        f"Should have duplicate-dropped note; got notes: {report.notes}"
