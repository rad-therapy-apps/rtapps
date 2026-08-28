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
