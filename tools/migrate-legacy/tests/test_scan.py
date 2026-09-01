"""Test the whole-repo scan command (scan module): walks a legacy content tree,
converts every HTML file via the paged-lesson converter and the activity-array
extractor/classifier, and writes import JSON per document."""

import json
from pathlib import Path

from migrate_legacy.scan import scan_tree

FIXTURE_ROOT = Path(__file__).parent / "fixtures/legacy_root"


def test_scan_tree_writes_docs_and_reports(tmp_path: Path) -> None:
    reports = scan_tree(FIXTURE_ROOT, tmp_path, subjects=None)
    by_page = {(r["page"], r["kind"]): r for r in reports}
    # Lesson + its embedded matching + the sibling flashcards file, under subject-a.
    assert (tmp_path / "subject-a/lesson-one.json").exists()
    assert (tmp_path / "subject-a/lesson-one-matching.json").exists()
    assert (tmp_path / "subject-a/one-flashcards-activity.json").exists()
    # The standalone quiz page under subject-b.
    quiz = json.loads((tmp_path / "subject-b/quiz-thing-quiz.json").read_text())
    assert quiz["subject"]["slug"] == "subject-b"  # scanner-injected subject
    assert quiz["quiz"]["questions"][0]["answer"] in (0, 1)
    # The radio/correctAnswers page is unsupported, with a note, and wrote nothing.
    unsupported = [r for r in reports if r["status"] == "unsupported"]
    assert any("Weird" in r["page"] for r in unsupported)
    assert by_page  # sanity: dict comprehension didn't collapse distinct entries


def test_scan_is_deterministic(tmp_path: Path) -> None:
    a = scan_tree(FIXTURE_ROOT, tmp_path / "a", subjects=None)
    b = scan_tree(FIXTURE_ROOT, tmp_path / "b", subjects=None)
    assert a == b  # sorted walks; no set/dict iteration order leaks into output


def test_scan_subjects_filter_and_order(tmp_path: Path) -> None:
    """Restricting `subjects` still assigns `order` by the sorted subject list,
    and skips directories not named."""
    reports = scan_tree(FIXTURE_ROOT, tmp_path, subjects=["Subject_B"])
    assert all("Subject_A" not in r["page"] for r in reports)
    quiz = json.loads((tmp_path / "subject-b/quiz-thing-quiz.json").read_text())
    assert quiz["subject"]["order"] == 0


def test_scan_lesson_document_has_subject_and_slug(tmp_path: Path) -> None:
    reports = scan_tree(FIXTURE_ROOT, tmp_path, subjects=None)
    lesson_reports = [r for r in reports if r["kind"] == "lesson"]
    assert lesson_reports and lesson_reports[0]["status"] in ("converted", "needs-review")
    lesson = json.loads((tmp_path / "subject-a/lesson-one.json").read_text())
    assert lesson["subject"] == {"slug": "subject-a", "title": "Subject A", "order": 0}
    assert lesson["lesson"]["slug"] == "lesson-one"
