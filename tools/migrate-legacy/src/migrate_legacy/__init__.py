"""Convert legacy paged-lesson HTML into lesson-import JSON.

What this file does: package marker for the `migrate_legacy` distribution; re-exports
nothing itself, the real logic lives in `cli.py`, `convert.py` and `html2prose.py`.

Used here and why: split into a thin CLI (`cli.py`), a pure HTML->document converter
(`convert.py`) and a pure HTML->prose-node mapper (`html2prose.py`) so the mapping rules
can be golden- and unit-tested without touching argv or the filesystem.

How it fits the project: this is `tools/migrate-legacy` (see `docs/03-architecture.md`
§9, §11 "Migration tool"); it turns legacy paged HTML lessons into the JSON documents the
API's importer loads, validated against `packages/schemas/prose-doc.schema.json`.

Works with: `cli.py` (entry point), `convert.py`, `html2prose.py`.
Depends on: beautifulsoup4.
Used by: `make seed` / `make test-tools` (repo root `Makefile`); `apps/api/app/content/importer.py`
consumes the JSON this package writes into `apps/api/seed/lessons/`.
"""
