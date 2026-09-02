"""What this file tests: `migrate_legacy.activities` classification and conversion functions
(convert_quiz, convert_flashcards, convert_matching, convert_sequencing) that transform
legacy JS array formats into import-doc structures; includes unit tests for each converter
and end-to-end tests against fixture HTML pages.

Used here and why: each converter is tested in isolation with synthetic data and against
real legacy fixture files (quiz_page.html, flashcards_page.html). Golden-dict assertions
verify the entire converted document structure, not just fields; every question/card is
asserted, catching any missed or partially-converted data. This ensures the converters
handle edge cases (missing explanations, duplicate definitions, unordered rows) correctly.

How it fits the project: implements the activity-data migration path (Task 6/7 of plan 3a).
The classify_arrays function is tested as a router; each converter is tested in isolation
and as part of the end-to-end extraction→classification→conversion pipeline.

Works with: `migrate_legacy.extract.js_arrays` (input); `migrate_legacy.activities` converters.
Used by: `make test-tools` / `uv run pytest` (from `tools/migrate-legacy`).
"""

from pathlib import Path

from migrate_legacy.activities import (
    classify_arrays,
    convert_flashcards,
    convert_matching,
    convert_quiz,
    convert_sequencing,
)
from migrate_legacy.extract import js_arrays


def test_classify_by_key_signature_and_name() -> None:
    notes: list[str] = []
    arrays = {
        "quizData": [{"question": "Q?", "options": ["A"], "answer": "A"}],
        "matchingData": [{"term": "T", "definition": "D"}],
        "flashcardData": [{"term": "T", "definition": "D"}],
        "cards": [{"term": "T", "definition": "D"}],  # ambiguous name
        "journeyStages": [{"id": "s1", "order": 1, "name": "One"}],
        "layout": [
            {"top": "50%", "left": "10%", "name": "x", "description": "y"}
        ],  # positional art
    }
    kinds = dict((name, kind) for kind, name, _ in classify_arrays(arrays, "index.html", notes))
    assert kinds["quizData"] == "quiz"
    assert kinds["matchingData"] == "matching"
    assert kinds["flashcardData"] == "flashcards"
    # default for term/definition
    assert kinds["cards"] == "flashcards"
    assert any("ambiguous" in n and "cards" in n for n in notes)
    assert kinds["journeyStages"] == "sequencing"
    # top/left keys => decorative, skipped
    assert "layout" not in kinds


def test_convert_quiz_maps_answer_text_to_index() -> None:
    notes: list[str] = []
    doc = convert_quiz(
        [
            {"question": "Q1?", "options": ["Atrophy", "Erythema"], "answer": "Erythema"},
            {"question": "Q2?", "options": ["A", "B"], "answer": "MISSING", "explanation": "E."},
        ],
        slug="radiation-effects-quiz",
        title="Radiation Effects: Quiz",
        notes=notes,
    )
    q1, q2 = doc["quiz"]["questions"]
    assert q1["answer"] == 1
    assert q2["answer"] == 0 and any("no correct answer" in n for n in notes)
    assert q2["explanation"] == "E."
    assert doc["quiz"]["pass_percent"] == 80


def test_convert_flashcards_passthrough() -> None:
    doc = convert_flashcards([{"term": "ARS", "definition": "…"}], slug="s", title="T", notes=[])
    assert doc["flashcards"]["cards"] == [{"term": "ARS", "definition": "…"}]


def test_convert_quiz_from_fixture() -> None:
    """End-to-end: extract and convert golden quiz fixture; assert entire document."""
    fixture_path = Path(__file__).parent / "fixtures" / "quiz_page.html"
    html = fixture_path.read_text(encoding="utf-8")
    notes: list[str] = []
    arrays = js_arrays(html, notes)
    doc = convert_quiz(
        arrays["quizData"],
        slug="radiation-effects-quiz",
        title="Radiation Effects: Quiz",
        notes=notes,
    )
    expected = {
        "quiz": {
            "slug": "radiation-effects-quiz",
            "title": "Radiation Effects: Quiz",
            "pass_percent": 80,
            "shuffle": True,
            "questions": [
                {
                    "stem": (
                        "After a high radiation dose, the shrinkage of organs and "
                        "tissues is referred to as:"
                    ),
                    "options": ["Atrophy", "Desquamation", "Erythema", "Radiodermatitis"],
                    "answer": 0,
                    "explanation": None,
                    "outcomes": [],
                },
                {
                    "stem": (
                        "Which of the following measures of lethality is perhaps "
                        "the most accurate for human survival?"
                    ),
                    "options": ["LD 10/30", "LD 50/30", "LD 50/60", "LD 100/60"],
                    "answer": 2,
                    "explanation": None,
                    "outcomes": [],
                },
                {
                    "stem": (
                        "In humans with the gastrointestinal form of ARS, the part "
                        "of the body most severely affected is the:"
                    ),
                    "options": ["Brain", "Heart", "Large intestine", "Small intestine"],
                    "answer": 3,
                    "explanation": None,
                    "outcomes": [],
                },
            ],
        }
    }
    assert doc == expected


def test_convert_flashcards_from_fixture() -> None:
    """End-to-end: extract and convert golden flashcard fixture; assert entire document."""
    fixture_path = Path(__file__).parent / "fixtures" / "flashcards_page.html"
    html = fixture_path.read_text(encoding="utf-8")
    notes: list[str] = []
    arrays = js_arrays(html, notes)
    doc = convert_flashcards(
        arrays["flashcardData"],
        slug="oncology-vocabulary",
        title="Oncology Vocabulary",
        notes=notes,
    )
    expected = {
        "flashcards": {
            "slug": "oncology-vocabulary",
            "title": "Oncology Vocabulary",
            "cards": [
                {
                    "term": "Oncology",
                    "definition": (
                        "The branch of medicine that deals with the prevention, "
                        "diagnosis, and treatment of tumors and cancer."
                    ),
                },
                {
                    "term": "Cancer",
                    "definition": (
                        "A disease characterized by the uncontrolled growth and "
                        "spread of abnormal cells."
                    ),
                },
                {
                    "term": "Benign Tumor",
                    "definition": (
                        "A non-cancerous growth that does not spread to other "
                        "parts of the body and is usually not life-threatening."
                    ),
                },
                {
                    "term": "Malignant Tumor",
                    "definition": (
                        "A cancerous growth that can invade nearby tissues and "
                        "spread (metastasize) to other parts of the body."
                    ),
                },
            ],
        }
    }
    assert doc == expected


def test_convert_matching_drops_duplicate_definitions() -> None:
    notes: list[str] = []
    doc = convert_matching(
        [
            {"term": "Anode", "definition": "Positive electrode."},
            {"term": "Cathode", "definition": "Negative electrode."},
            {"term": "Target", "definition": "Positive electrode."},  # duplicate definition
        ],
        slug="tube-parts-matching",
        title="Tube Parts: Matching",
        notes=notes,
    )
    matching = doc["matching"]
    assert matching["pairs"] == [
        {"term": "Anode", "definition": "Positive electrode."},
        {"term": "Cathode", "definition": "Negative electrode."},
    ]
    assert matching["present_n"] is None
    assert any("duplicate definition" in n for n in notes)


def test_convert_matching_drops_duplicate_terms() -> None:
    notes: list[str] = []
    doc = convert_matching(
        [
            {"term": "Anode", "definition": "Positive electrode."},
            {"term": "Cathode", "definition": "Negative electrode."},
            {"term": "Anode", "definition": "Also positive."},  # duplicate term
        ],
        slug="tube-parts-matching",
        title="Tube Parts: Matching",
        notes=notes,
    )
    matching = doc["matching"]
    assert matching["pairs"] == [
        {"term": "Anode", "definition": "Positive electrode."},
        {"term": "Cathode", "definition": "Negative electrode."},
    ]
    assert any("duplicate term" in n and "Anode" in n for n in notes)


def test_convert_matching_dedup_floor_guard_notes_when_below_two_pairs() -> None:
    """If dedup drops the pair count below 2 (the API importer's minimum), a
    note flags it even though the (too-short) document is still built."""
    notes: list[str] = []
    doc = convert_matching(
        [
            {"term": "Anode", "definition": "Positive electrode."},
            {"term": "Anode", "definition": "Positive electrode, again."},  # dup term
            {"term": "Cathode", "definition": "Positive electrode."},  # dup definition
        ],
        slug="tube-parts-matching",
        title="Tube Parts: Matching",
        notes=notes,
    )
    assert doc["matching"]["pairs"] == [{"term": "Anode", "definition": "Positive electrode."}]
    assert any("fewer than 2 pairs after dedup" in n for n in notes)


def test_convert_matching_passthrough_no_duplicates() -> None:
    doc = convert_matching(
        [{"term": "A", "definition": "a"}, {"term": "B", "definition": "b"}],
        slug="s",
        title="T",
        notes=[],
    )
    assert doc["matching"]["pairs"] == [
        {"term": "A", "definition": "a"},
        {"term": "B", "definition": "b"},
    ]


def test_convert_sequencing_sorts_by_order_and_adds_detail() -> None:
    doc = convert_sequencing(
        [
            {"order": 2, "name": "Second", "description": "Do this second."},
            {"order": 1, "name": "First"},
        ],
        slug="steps-sequencing",
        title="Steps: Sequencing",
        notes=[],
    )
    items = doc["sequencing"]["items"]
    assert items == [
        {"label": "First"},
        {"label": "Second", "detail": "Do this second."},
    ]


def test_convert_sequencing_missing_order_keeps_document_order() -> None:
    notes: list[str] = []
    data = [{"name": "Second"}, {"order": 1, "name": "First"}]
    doc = convert_sequencing(data, slug="s", title="T", notes=notes)
    assert doc["sequencing"]["items"] == [{"label": "Second"}, {"label": "First"}]
    assert any("missing order" in n for n in notes)
