"""Walk a legacy content tree, convert every document it contains, and write
per-document import JSON plus a per-page conversion report.

What this file does: `scan_tree` discovers subject directories under a legacy
content root, walks each one for `.html` files, and for each file runs the
paged-lesson converter (`convert_lesson`) and the activity-array extractor/
classifier (`extract.js_arrays` + `activities.classify_arrays`) — a legacy
lesson page can carry both a lesson body and one or more embedded quiz/
matching/etc. arrays, so both paths run on the same file. Every resulting
document gets its `subject` key overridden by the scanner (subject = the
top-level directory, never a nested one) and is written to
`out/<subject-slug>/<doc-slug>.json`.

Scan rules (see also the per-rule comments below):
  1. Subject = the top-level directory name; nested dirs never become subjects.
     The scanner overrides every document's `subject` to
     `{slug, title, order}` where `order` is the index into the *sorted*
     subject list.
  2. Per `.html` file: if it's a paged lesson, run `convert_lesson`;
     additionally always run the array extractor/classifier on the same
     file (lesson pages can embed sibling activity arrays).
  3. A non-lesson file with no classifiable arrays reports `unsupported`
     (extractor notes attached) and writes nothing. `EXCLUDED_DIRS` are
     never scanned, at any depth.
  4. Activity slugs: `X/index.html` -> `f"{slugify(X)}-{kind}"`;
     `*_activity.html` -> `slugify(stem)`. Titles: `f"{page_title}: {kind.title()}"`,
     page title from the file's `<h1>` (fallback: directory name). A second
     array of the same kind in one file gets `-2`, `-3`, ... and a note.
  5. Slug collisions across the *whole* scan: first occurrence keeps its
     plain slug; later ones become `f"{subject_slug}-{slug}"` with a note.
     Resolved after conversion, before anything is written.
  6. `convert_matching`/`convert_sequencing` live in `activities.py`.
  7. A document's status is `needs-review` if it accumulated any note, else
     `converted`; a file that yields no document at all is `unsupported`.

Used here and why: every filesystem walk (`Path.iterdir`, `os.walk`) is sorted
so two scans of the same tree produce byte-identical output — required by
`tests/test_scan.py::test_scan_is_deterministic` and generally good practice
for a tool whose output gets committed/diffed.

How it fits the project: this is the Task 7 whole-repo entry point for the
migrate-legacy tool (plan 3a); it composes Task 6's extractor/classifier with
the existing lesson converter rather than duplicating either.

Works with: `convert.convert_lesson`; `extract.js_arrays`;
`activities.classify_arrays`/`convert_quiz`/`convert_flashcards`/
`convert_matching`/`convert_sequencing`.
Depends on: beautifulsoup4 (page-title lookup only).
Used by: `cli.py`'s `scan` subcommand; `tests/test_scan.py` exercises this
directly.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from bs4 import BeautifulSoup, Tag

from migrate_legacy.activities import (
    classify_arrays,
    convert_flashcards,
    convert_matching,
    convert_quiz,
    convert_sequencing,
)
from migrate_legacy.convert import _slugify, convert_lesson
from migrate_legacy.extract import js_arrays
from migrate_legacy.html2prose import collapse_whitespace

# Rule 3: these top-level (and nested) directories are never scanned — legacy
# app shells, shared assets, and the legacy repo checkout itself.
EXCLUDED_DIRS = {
    "apps",
    "assets",
    "shared",
    "examples",
    "rtt_e_workbook",
    "simulated_radiation_center",
}

_CONVERTERS = {
    "quiz": convert_quiz,
    "flashcards": convert_flashcards,
    "matching": convert_matching,
    "sequencing": convert_sequencing,
}


@dataclass
class _PendingDoc:
    """One document produced by a scanned file, awaiting rule-5 slug
    collision resolution and then writing. `notes`/`base_slug` are mutated
    in place by `_resolve_collisions`; `final_slug` is filled in after."""

    page: str
    kind: str
    subject_name: str
    doc: dict[str, Any]
    doc_key: str
    base_slug: str
    notes: list[str] = field(default_factory=list)
    final_slug: str = ""


def _subject_dirs(root: Path, subjects: list[str] | None) -> list[str]:
    """The sorted list of subject directory names to scan. Explicit
    `subjects` are filtered through `EXCLUDED_DIRS` same as auto-discovery
    (still sorted, for rule 1's `order`); otherwise every top-level,
    non-excluded directory containing at least one `.html` file anywhere
    under it."""
    if subjects is not None:
        # Rule 3: EXCLUDED_DIRS are never scanned, even when named explicitly.
        return sorted(s for s in subjects if s not in EXCLUDED_DIRS)
    names = []
    for entry in sorted(root.iterdir(), key=lambda p: p.name):
        if not entry.is_dir() or entry.name in EXCLUDED_DIRS:
            continue
        if any(entry.rglob("*.html")):
            names.append(entry.name)
    return names


def _iter_html_files(subject_dir: Path) -> list[Path]:
    """Every `.html` file under `subject_dir`, in a sorted, deterministic
    walk order, skipping `EXCLUDED_DIRS` at any depth."""
    found: list[Path] = []
    for dirpath, dirnames, filenames in os.walk(subject_dir):
        dirnames[:] = sorted(d for d in dirnames if d not in EXCLUDED_DIRS)
        for filename in sorted(filenames):
            if filename.endswith(".html"):
                found.append(Path(dirpath) / filename)
    return found


def _page_title(html: str, page_dir: Path) -> str:
    """The file's `<h1>` text, or (fallback) its directory name."""
    soup = BeautifulSoup(html, "html.parser")
    found = soup.find("h1")
    h1 = found if isinstance(found, Tag) else None
    if h1 is not None:
        text = collapse_whitespace(h1.get_text()).strip()
        if text:
            return text
    return page_dir.name.replace("_", " ")


def _scan_file(
    html_path: Path, root: Path, subject_name: str
) -> tuple[list[_PendingDoc], dict[str, Any] | None]:
    """Convert one `.html` file. Returns the pending documents it produced
    (lesson and/or activities) and, if it produced none at all, an
    `unsupported` report entry (rule 3) instead."""
    page = html_path.relative_to(root).as_posix()
    docs: list[_PendingDoc] = []

    lesson_doc, lesson_report = convert_lesson(html_path, root)
    if lesson_report.status != "unsupported":
        docs.append(
            _PendingDoc(
                page=page,
                kind="lesson",
                subject_name=subject_name,
                doc=lesson_doc,
                doc_key="lesson",
                base_slug=lesson_doc["lesson"]["slug"],
                notes=list(lesson_report.notes),
            )
        )

    html = html_path.read_text(encoding="utf-8")
    extract_notes: list[str] = []
    arrays = js_arrays(html, extract_notes)
    classify_notes: list[str] = []
    classified = classify_arrays(arrays, html_path.name, classify_notes)

    if classified:
        page_title = _page_title(html, html_path.parent)
        is_activity_file = html_path.name.endswith("_activity.html")
        kind_counts: dict[str, int] = {}
        for kind, name, data in classified:
            kind_counts[kind] = kind_counts.get(kind, 0) + 1
            occurrence = kind_counts[kind]

            if is_activity_file:
                base_slug = _slugify(html_path.stem)
            else:
                base_slug = f"{_slugify(html_path.parent.name)}-{kind}"

            # Notes classify_arrays recorded specifically about this array (e.g.
            # an "ambiguous ... defaulted to flashcards" note) — classify_arrays
            # shares one notes list per file and tags each note "[name] ...", so
            # match on that exact tag (not a bare substring: a variable literally
            # named "cards" would otherwise match a note about "flashcards" too).
            tag = f"[{name}] "
            doc_notes = [n[len(tag) :] for n in classify_notes if n.startswith(tag)]

            if occurrence > 1:
                base_slug = f"{base_slug}-{occurrence}"
                doc_notes.append(
                    f"multiple {kind} arrays in {html_path.name}; slug suffixed to {base_slug}"
                )

            title = f"{page_title}: {kind.title()}"
            doc = _CONVERTERS[kind](data, slug=base_slug, title=title, notes=doc_notes)
            docs.append(
                _PendingDoc(
                    page=page,
                    kind=kind,
                    subject_name=subject_name,
                    doc=doc,
                    doc_key=kind,
                    base_slug=base_slug,
                    notes=doc_notes,
                )
            )
    elif lesson_report.status == "unsupported":
        # Rule 3: nothing at all came out of this file.
        return [], {
            "page": page,
            "kind": "unsupported",
            "status": "unsupported",
            "notes": extract_notes + classify_notes,
        }

    return docs, None


def _resolve_collisions(items: list[_PendingDoc]) -> None:
    """Rule 5: first document to claim a slug keeps it; later ones (in scan
    order) get `subject_slug-slug` and a needs-review note. Mutates `items`
    in place (`notes`, `final_slug`)."""
    seen_slugs: set[str] = set()
    for item in items:
        subject_slug = _slugify(item.subject_name)
        slug = item.base_slug
        if slug in seen_slugs:
            renamed = f"{subject_slug}-{item.base_slug}"
            # Three-way (or worse) collision guard: `subject_slug-slug` can
            # itself already be claimed, so keep suffixing -2, -3, ... until free.
            suffix = 2
            while renamed in seen_slugs:
                renamed = f"{subject_slug}-{item.base_slug}-{suffix}"
                suffix += 1
            slug = renamed
            item.notes.append(f"slug collision on {item.base_slug!r}; renamed to {slug!r}")
        seen_slugs.add(slug)
        item.final_slug = slug


def scan_tree(root: Path, out: Path, subjects: list[str] | None) -> list[dict[str, Any]]:
    """Walk `root`, convert every document, write `out/<subject-slug>/<doc-slug>.json`,
    and return one report entry per (page, kind): `{page, kind, status, notes}`."""
    subject_names = _subject_dirs(root, subjects)
    subject_meta: dict[str, dict[str, Any]] = {
        name: {"slug": _slugify(name), "title": name.replace("_", " "), "order": i}
        for i, name in enumerate(subject_names)
    }

    # Rule 1: sorted subject dirs, sorted file walk within each — a single
    # ordered list of entries (pending docs or ready-made unsupported reports)
    # in true scan order, so determinism and rule-5 ordering fall out for free.
    entries: list[_PendingDoc | dict[str, Any]] = []
    for subject_name in subject_names:
        subject_dir = root / subject_name
        for html_path in _iter_html_files(subject_dir):
            docs, unsupported_report = _scan_file(html_path, root, subject_name)
            entries.extend(docs)
            if unsupported_report is not None:
                entries.append(unsupported_report)

    pending = [e for e in entries if isinstance(e, _PendingDoc)]
    _resolve_collisions(pending)

    reports: list[dict[str, Any]] = []
    for entry in entries:
        if isinstance(entry, dict):
            reports.append(entry)
            continue
        entry.doc[entry.doc_key]["slug"] = entry.final_slug
        entry.doc["subject"] = dict(subject_meta[entry.subject_name])
        status = "needs-review" if entry.notes else "converted"
        out_dir = out / subject_meta[entry.subject_name]["slug"]
        out_dir.mkdir(parents=True, exist_ok=True)
        (out_dir / f"{entry.final_slug}.json").write_text(json.dumps(entry.doc, indent=2) + "\n")
        reports.append(
            {"page": entry.page, "kind": entry.kind, "status": status, "notes": entry.notes}
        )
    return reports
