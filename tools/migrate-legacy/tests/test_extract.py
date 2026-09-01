"""What this file tests: `migrate_legacy.extract.js_arrays`, the JS array literal extractor
that parses quiz, flashcard, matching, and sequencing data from legacy HTML pages. Tests
cover both synthetic HTML examples and real legacy fixture files.

Used here and why: the extractor is the first stage of the activity-data migration pipeline.
Unit tests verify correct parsing of well-formed arrays, graceful handling of unparseable
JS, and preservation of edge cases (apostrophes in strings, bracket literals in content).
End-to-end tests against fixtures (quiz_page.html, flashcards_page.html) validate that
the extractor retrieves the correct data structure and cardinality from real legacy content.

How it fits the project: implements the extraction stage of the activity-data migration path
(Task 6/7 of plan 3a). The js_arrays function is the entry point for the whole pipeline;
these tests verify it extracts data in the shape that classify_arrays and the converters expect.

Works with: `migrate_legacy.activities` (classify_arrays, converters consume the extracted arrays).
Used by: `make test-tools` / `uv run pytest` (from `tools/migrate-legacy`).
"""

from pathlib import Path

from migrate_legacy.extract import js_arrays

HTML = """
<script>
  const quizData = [
    { question: "Q1?", options: ["A", "B"], answer: "B" },
    { question: "It's tricky?", options: ["Yes", "No"], answer: "Yes", explanation: "Because." },
  ];
  const notAList = { a: 1 };
  const broken = [ { question: template`nope` } ];
  let flashcardData = [ { term: 'ARS', definition: "Acute [radiation] syndrome, 1 Gy+" } ];
</script>
"""


def test_extracts_parseable_arrays_only() -> None:
    notes: list[str] = []
    arrays = js_arrays(HTML, notes)
    assert set(arrays) == {"quizData", "flashcardData"}
    # apostrophes survive
    assert arrays["quizData"][1]["question"] == "It's tricky?"
    # brackets in strings
    assert arrays["flashcardData"][0]["definition"].startswith("Acute [radiation]")
    # unparseable flagged, not fatal
    assert any("broken" in n for n in notes)


def test_extract_quiz_fixture() -> None:
    """End-to-end: parse golden quiz fixture from legacy page."""
    fixture_path = Path(__file__).parent / "fixtures" / "quiz_page.html"
    html = fixture_path.read_text(encoding="utf-8")
    notes: list[str] = []
    arrays = js_arrays(html, notes)
    assert "quizData" in arrays
    assert len(arrays["quizData"]) == 3
    q0 = arrays["quizData"][0]
    assert q0["question"].startswith("After a high radiation dose")
    assert q0["answer"] == "Atrophy"
    assert arrays["quizData"][1]["options"] == ["LD 10/30", "LD 50/30", "LD 50/60", "LD 100/60"]
    assert arrays["quizData"][2]["question"].startswith("In humans with the gastrointestinal")


def test_extract_flashcard_fixture() -> None:
    """End-to-end: parse golden flashcard fixture from legacy page."""
    fixture_path = Path(__file__).parent / "fixtures" / "flashcards_page.html"
    html = fixture_path.read_text(encoding="utf-8")
    notes: list[str] = []
    arrays = js_arrays(html, notes)
    assert "flashcardData" in arrays
    assert len(arrays["flashcardData"]) == 4
    assert arrays["flashcardData"][0]["term"] == "Oncology"
    assert "prevention, diagnosis, and treatment" in arrays["flashcardData"][0]["definition"]
    assert arrays["flashcardData"][3]["term"] == "Malignant Tumor"
