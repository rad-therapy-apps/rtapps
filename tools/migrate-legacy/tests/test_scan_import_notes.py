"""Test that scan_tree embeds each written document's notes as a top-level
"import_notes" array (plan 3b Task 4), so the API importers can carry them into
activity.config["import_notes"] for the authoring UI's needs-review queue."""

import json
from pathlib import Path

from migrate_legacy.scan import scan_tree

FIXTURE_ROOT = Path(__file__).parent / "fixtures/legacy_root"


def test_scan_writes_import_notes_for_flagged_doc_and_omits_for_clean_doc(
    tmp_path: Path,
) -> None:
    """Subject_C's Two_Quizzes page produces two quiz docs: the first is clean
    (converted, no notes) and the second collides on kind, picking up a
    needs-review note — see test_scan_duplicate_kind_in_file_gets_suffix_and_note."""
    reports = scan_tree(FIXTURE_ROOT, tmp_path, subjects=["Subject_C"])
    page = "Subject_C/Two_Quizzes/index.html"
    quiz_reports = [r for r in reports if r["page"] == page and r["kind"] == "quiz"]
    first, second = quiz_reports
    assert first["status"] == "converted" and not first["notes"]
    assert second["status"] == "needs-review" and second["notes"]

    clean_doc = json.loads((tmp_path / "subject-c/two-quizzes-quiz.json").read_text())
    assert "import_notes" not in clean_doc

    flagged_doc = json.loads((tmp_path / "subject-c/two-quizzes-quiz-2.json").read_text())
    assert flagged_doc["import_notes"] == second["notes"]
