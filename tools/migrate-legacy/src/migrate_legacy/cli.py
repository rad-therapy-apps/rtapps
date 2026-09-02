"""`migrate-legacy convert PATH [PATH…] --out DIR [--report FILE]`
`migrate-legacy scan ROOT --out DIR [--report FILE] [--subjects NAME…]`

`convert` takes explicit lesson directories (each containing an `index.html`)
and writes one `DIR/<lesson-slug>.json` per successfully converted lesson.
`scan` walks a whole legacy content tree, converting every lesson and
embedded/standalone activity array it finds (see `scan.scan_tree`), writing
`DIR/<subject-slug>/<doc-slug>.json` per document. Both accept `--report` to
also write a JSON array of `{page, status, notes}` (`scan` additionally has
`kind`) reports.

What this file does: the command-line entry point — parses argv, dispatches to
`convert_lesson` (per lesson directory) or `scan_tree` (per content-tree root),
writes the output JSON and the optional report file, and picks the process
exit code.

Used here and why: a thin `argparse` wrapper kept separate from `convert.py`/
`scan.py` so the conversion logic stays testable as plain functions with no
argv/filesystem coupling (see `tests/test_convert.py`, `tests/test_needs_review.py`,
`tests/test_scan.py`).

How it fits the project: invoked per `docs/05-setup.md` "Migrating legacy lessons"
(`uv run migrate-legacy convert ... --out apps/api/seed/lessons`); `make seed` then
imports those files with `apps/api/app/content/importer.py`. `scan` is the
whole-repo inventory pass used to convert the full legacy workbook.

Works with: `migrate_legacy.convert.convert_lesson`, `migrate_legacy.scan.scan_tree`.
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
from migrate_legacy.scan import scan_tree


def _run_convert(args: argparse.Namespace) -> int:
    """`convert`: explicit lesson directories, one JSON file each."""
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


def _run_scan(args: argparse.Namespace) -> int:
    """`scan`: a whole legacy content tree, one JSON file per document."""
    args.out.mkdir(parents=True, exist_ok=True)
    reports = scan_tree(args.root, args.out, args.subjects)

    counts = {"converted": 0, "needs-review": 0, "unsupported": 0}
    for report in reports:
        counts[report["status"]] += 1
        if report["status"] != "unsupported":
            print(f"{report['status']}: {report['kind']} {report['page']}")

    print(
        f"converted={counts['converted']} "
        f"needs-review={counts['needs-review']} "
        f"unsupported={counts['unsupported']}"
    )

    if args.report:
        args.report.write_text(json.dumps(reports, indent=2) + "\n")

    # scan is an inventory, not a gate: it always exits 0, even with unsupported
    # pages — the report/console output is how those get surfaced for a human.
    return 0


def main(argv: list[str] | None = None) -> int:
    """Parse argv and dispatch to the `convert` or `scan` subcommand."""
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

    scan_parser = subparsers.add_parser(
        "scan", help="Walk a legacy content tree and convert every document in it"
    )
    scan_parser.add_argument("root", type=Path, help="Legacy content tree root directory")
    scan_parser.add_argument("--out", required=True, type=Path, help="Output directory")
    scan_parser.add_argument("--report", type=Path, help="Write a JSON array report to this file")
    scan_parser.add_argument(
        "--subjects", nargs="+", help="Restrict the scan to these subject directory names"
    )

    args = parser.parse_args(argv)

    if args.command == "convert":
        return _run_convert(args)
    return _run_scan(args)


if __name__ == "__main__":
    raise SystemExit(main())
