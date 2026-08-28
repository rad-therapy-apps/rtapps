# migrate-legacy

Converts legacy paged-lesson HTML (the `rtt_e_workbook` "flip lesson" pattern —
one `div.lesson-page` per page, an inline `<script>` with a knowledge-check
answer key) into the `LessonImport` JSON documents consumed by
`apps/api/app/content/importer.py`.

## Usage

```sh
uv run migrate-legacy convert PATH [PATH…] --out DIR [--report FILE]
```

Each `PATH` is a lesson directory containing an `index.html`. Writes one
`DIR/<lesson-slug>.json` per successfully converted lesson, and (with
`--report`) a JSON array of `{page, status, notes}` — `status` is one of
`converted`, `needs-review` (some element or answer couldn't be mapped
cleanly — see `notes`), or `unsupported` (not a paged lesson at all).

## Mapping rules

See `src/migrate_legacy/html2prose.py` (inline/element → prose mapping) and
`src/migrate_legacy/convert.py` (page/knowledge-check assembly) for the exact
rules; `tests/test_html2prose.py` and `tests/test_convert.py` pin them down
with examples, including the two golden fixtures under `tests/fixtures/`.

## Development

```sh
uv sync
uv run pytest -q
uv run ruff check . && uv run ruff format --check . && uv run mypy src
```
