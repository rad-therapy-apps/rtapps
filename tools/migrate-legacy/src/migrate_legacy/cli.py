"""`migrate-legacy convert PATH [PATH…] --out DIR [--report FILE]`

Each `PATH` is a lesson directory containing an `index.html`. Writes one
`DIR/<lesson-slug>.json` per successfully converted lesson, and (if
`--report` is given) a JSON array of `{page, status, notes}` reports.

What this file does: the command-line entry point — parses argv, calls
`convert_lesson` per lesson directory, writes the output JSON and the optional
report file, and picks the process exit code.

Used here and why: a thin `argparse` wrapper kept separate from `convert.py` so the
conversion logic stays testable as plain functions with no argv/filesystem coupling
(see `tests/test_convert.py`, `tests/test_needs_review.py`).

How it fits the project: invoked per `docs/05-setup.md` "Migrating legacy lessons"
(`uv run migrate-legacy convert ... --out apps/api/seed/lessons`); `make seed` then
imports those files with `apps/api/app/content/importer.py`.

Works with: `migrate_legacy.convert.convert_lesson`.
Depends on: `argparse`, `json` (stdlib only).
Used by: the `[project.scripts]` entry in `pyproject.toml`
(`migrate-legacy = "migrate_legacy.cli:main"`); the `tools` CI job in
`.github/workflows/pr.yml` runs the test suite, not this CLI directly.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from migrate_legacy.convert import convert_lesson


def main(argv: list[str] | None = None) -> int:
    """Parse argv, run `convert` over every path, write outputs, return the exit code."""
    parser = argparse.ArgumentParser(prog="migrate-legacy")
    subparsers = parser.add_subparsers(dest="command", required=True)

    convert_parser = subparsers.add_parser(
        "convert", help="Convert paged-lesson legacy HTML to lesson-import JSON"
    )
    convert_parser.add_argument(
        "paths", nargs="+", type=Path, help="Lesson directories containing index.html"
    )
    convert_parser.add_argument("--out", required=True, type=Path, help="Output directory")
    convert_parser.add_argument(
        "--report", type=Path, help="Write a JSON array report to this file"
    )

    args = parser.parse_args(argv)

    args.out.mkdir(parents=True, exist_ok=True)
    reports = []
    ok = True
    for lesson_dir in args.paths:
        index_html = lesson_dir / "index.html"
        legacy_root = lesson_dir.parent.parent
        doc, report = convert_lesson(index_html, legacy_root)
        reports.append({"page": report.page, "status": report.status, "notes": report.notes})
        if report.status == "unsupported":
            # Not the paged-lesson pattern at all: no file written, and the process
            # exit code goes non-zero so CI/manual runs notice without parsing the report.
            ok = False
            print(f"unsupported: {lesson_dir}", file=sys.stderr)
            continue
        out_path = args.out / f"{doc['lesson']['slug']}.json"
        out_path.write_text(json.dumps(doc, indent=2) + "\n")
        print(f"{report.status}: {doc['lesson']['slug']} -> {out_path}")

    if args.report:
        args.report.write_text(json.dumps(reports, indent=2) + "\n")

    # "needs-review" lessons still write output and exit 0 — they're usable, just
    # flagged for a human to check the notes; only "unsupported" fails the run.
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
