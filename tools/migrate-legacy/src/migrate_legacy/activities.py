"""Classify extracted JS arrays by type and convert to import-doc format.

What this file does: inspects the key signatures and variable names of
extracted JS arrays to classify them as quiz, flashcards, matching, or
sequencing activities; filters out non-activity arrays (e.g. positioned
diagram labels); and converts each classified activity into the import-doc
JSON shape used by the API importer.

Used here and why: classification is key-signature-first (quiz has {question,
options, answer}; flashcards/matching both have {term, definition}), then
name/filename hints (matching vs flashcards disambiguated by "match" in the
variable or file name). Converters (quiz and flashcards here; matching and
sequencing deferred to Task 7) build the final import-doc structure, mapping
legacy fields to the API schema (e.g. answer text to 0-based index).

How it fits the project: implements the classification and initial-stage
conversion for the activity-data migration path (Task 6/7 of plan 3a).
Tasks 6 → 7 boundary: this file has the full classifier (all four kinds),
but quiz/flashcards converters only; matching/sequencing converters arrive
in Task 7 and call the same conversion pattern.

Works with: `extract.js_arrays` (input); `convert_lesson` (integration point).
Depends on: nothing (pure logic).
Used by: Task 7's scanner; `tests/test_activities.py` exercises this directly.
"""

from typing import Any

QUIZ_KEYS = {"question", "options", "answer"}
CARD_KEYS = {"term", "definition"}
# Keys marking a positioned diagram/label overlay, not an activity (seen in legacy pages).
DECOR_KEYS = {"top", "left"}


def _common_keys(data: list[dict[str, Any]]) -> set[str]:
    """Set of keys present in all rows of the data."""
    keys = set(data[0])
    for row in data[1:]:
        keys &= set(row)
    return keys


def classify_arrays(
    arrays: dict[str, list[Any]], filename: str, notes: list[str]
) -> list[tuple[str, str, list[Any]]]:
    """Classify each extracted array by key signature, then name/filename hints.

    Returns list of (kind, name, data) tuples where kind is one of:
    'quiz', 'flashcards', 'matching', 'sequencing'. Arrays that don't match
    any pattern (e.g. positioned overlays) are silently skipped.
    """
    out: list[tuple[str, str, list[Any]]] = []
    fname = filename.lower()
    for name, data in arrays.items():
        keys = _common_keys(data)
        lname = name.lower()
        if keys >= DECOR_KEYS:
            continue  # positioned overlay data (diagram labels), not an activity
        if keys >= QUIZ_KEYS:
            out.append(("quiz", name, data))
        elif keys >= CARD_KEYS or {"name", "description"} <= keys:
            # term/definition is shared by flashcards and matching; the variable or file
            # name decides, defaulting to flashcards with a review flag.
            if "match" in lname or "match" in fname:
                out.append(("matching", name, data))
            elif "flashcard" in lname or "flash" in lname or "flash" in fname:
                out.append(("flashcards", name, data))
            elif "card" in lname:
                # Generic "card" / "cards" is ambiguous, default to flashcards with note
                notes.append(f"ambiguous term/definition array {name}; defaulted to flashcards")
                out.append(("flashcards", name, data))
            else:
                notes.append(f"ambiguous term/definition array {name}; defaulted to flashcards")
                out.append(("flashcards", name, data))
        elif "order" in keys and ({"name", "title", "label"} & keys):
            out.append(("sequencing", name, data))
    return out


def _label(row: dict[str, Any]) -> str:
    """Extract a label/title from a row, trying multiple possible keys."""
    return str(row.get("name") or row.get("title") or row.get("label") or "").strip()


def _pair(row: dict[str, Any]) -> dict[str, str]:
    """Extract a term/definition pair from a row, trying multiple key variants."""
    term = str(row.get("term") or row.get("name") or "").strip()
    definition = str(row.get("definition") or row.get("description") or "").strip()
    return {"term": term, "definition": definition}


def convert_quiz(
    data: list[dict[str, Any]], *, slug: str, title: str, notes: list[str]
) -> dict[str, Any]:
    """Convert legacy quiz data to import-doc format.

    Transforms each question's answer text into a 0-based index into the options
    list. If the answer text is not found, logs a note and defaults to index 0.
    """
    questions = []
    for n, row in enumerate(data, start=1):
        options = [str(o) for o in row["options"]]
        answer_text = str(row["answer"])
        if answer_text in options:
            answer = options.index(answer_text)
        else:
            answer = 0
            notes.append(f"no correct answer for question {n} ({answer_text!r} not an option)")
        explanation = None
        if row.get("explanation"):
            explanation = str(row["explanation"]).strip() or None
        questions.append(
            {
                "stem": str(row["question"]).strip(),
                "options": options,
                "answer": answer,
                "explanation": explanation,
                "outcomes": [str(c) for c in row.get("competencies", [])]
                or ([str(row["outcomeCode"])] if row.get("outcomeCode") else []),
            }
        )
    return {
        "quiz": {
            "slug": slug,
            "title": title,
            "pass_percent": 80,
            "shuffle": True,
            "questions": questions,
        }
    }


def convert_flashcards(
    data: list[dict[str, Any]], *, slug: str, title: str, notes: list[str]
) -> dict[str, Any]:
    """Convert legacy flashcard data to import-doc format.

    Extracts term/definition pairs and filters out any with empty term or definition.
    """
    cards = [_pair(row) for row in data]
    for card in cards:
        if not card["term"] or not card["definition"]:
            notes.append(f"empty term/definition in {slug}")
    return {
        "flashcards": {
            "slug": slug,
            "title": title,
            "cards": [c for c in cards if c["term"] and c["definition"]],
        }
    }
