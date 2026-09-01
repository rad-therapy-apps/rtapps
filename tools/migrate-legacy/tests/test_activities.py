"""Test activity classification and conversion (activities module)."""

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
    """End-to-end: extract and convert golden quiz fixture."""
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
    quiz = doc["quiz"]
    assert quiz["slug"] == "radiation-effects-quiz"
    assert quiz["title"] == "Radiation Effects: Quiz"
    assert quiz["pass_percent"] == 80
    assert quiz["shuffle"] is True
    assert len(quiz["questions"]) == 3
    # Q1: answer is "Atrophy" (index 0)
    q0 = quiz["questions"][0]
    assert q0["stem"].startswith("After a high radiation dose")
    assert q0["options"] == ["Atrophy", "Desquamation", "Erythema", "Radiodermatitis"]
    assert q0["answer"] == 0
    # Q2: answer is "LD 50/60" (index 2)
    assert quiz["questions"][1]["answer"] == 2
    # Q3: answer is "Small intestine" (index 3)
    assert quiz["questions"][2]["answer"] == 3


def test_convert_flashcards_from_fixture() -> None:
    """End-to-end: extract and convert golden flashcard fixture."""
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
    flashcards = doc["flashcards"]
    assert flashcards["slug"] == "oncology-vocabulary"
    assert flashcards["title"] == "Oncology Vocabulary"
    assert len(flashcards["cards"]) == 4
    assert flashcards["cards"][0]["term"] == "Oncology"
    card0_def = flashcards["cards"][0]["definition"]
    assert "prevention, diagnosis, and treatment" in card0_def
    assert flashcards["cards"][1]["term"] == "Cancer"
    assert flashcards["cards"][3]["term"] == "Malignant Tumor"


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
