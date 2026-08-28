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
    doc, report = convert_lesson(FIXTURES / rel / "index.html", FIXTURES)
    expected = json.loads((HERE / "golden" / f"{slug}.json").read_text())
    assert doc == expected
    assert report.status == "converted", report.notes


@pytest.mark.parametrize(("rel", "slug"), CASES)
def test_every_prose_doc_validates(rel: str, slug: str) -> None:
    doc, _ = convert_lesson(FIXTURES / rel / "index.html", FIXTURES)
    v = Draft202012Validator(SCHEMA)
    for page in doc["lesson"]["pages"]:
        for block in page["blocks"]:
            for prose in ([block["body"]] if block["type"] == "rich_text" else [block["stem"], block["explanation"]]):
                if prose is not None:
                    v.validate(prose)


def test_rbe_specifics() -> None:
    doc, _ = convert_lesson(FIXTURES / "Radiation_Biology/RBE_and_OER/index.html", FIXTURES)
    assert doc["subject"] == {"slug": "radiation-biology", "title": "Radiation Biology", "order": 0}
    assert doc["lesson"]["slug"] == "rbe-and-oer" and doc["lesson"]["title"] == "RBE and OER"
    assert [p["title"] for p in doc["lesson"]["pages"]][:2] == ["Not All Radiation Damages Equally", "Relative Biologic Effectiveness (RBE)"]
    checks = [b for p in doc["lesson"]["pages"] for b in p["blocks"] if b["type"] == "knowledge_check"]
    assert [(c["key"], c["answer"]) for c in checks] == [("lq_page2_1", 1), ("lq_page5_1", 0)]
    assert checks[0]["options"] == ["RBE keeps increasing without limit", "RBE actually decreases past that point"]
    assert checks[0]["explanation"]["content"][0]["content"][0]["text"].startswith("Past the optimal LET")


def test_not_a_paged_lesson_is_unsupported(tmp_path: Path) -> None:
    (tmp_path / "X").mkdir()
    (tmp_path / "X/index.html").write_text("<html><body><h1>Quiz</h1></body></html>")
    doc, report = convert_lesson(tmp_path / "X/index.html", tmp_path)
    assert report.status == "unsupported" and doc == {}
