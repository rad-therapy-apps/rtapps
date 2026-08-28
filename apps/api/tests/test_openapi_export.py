"""What this file tests: `app/openapi_export.py`'s CLI entry point — that it prints a
valid, complete OpenAPI JSON document to stdout.

Used here and why: pytest's `capsys` fixture to capture stdout from a plain function call
(`main()`), no HTTP client or database needed since this only calls `create_app(...).openapi()`.

How it fits the project: this is what `make client` runs (`uv run python -m
app.openapi_export > packages/api-client/openapi.json`) to regenerate the typed frontend
API client; the `contract` CI job then diffs the generated client against what's committed,
so a broken or incomplete export here would silently desync the frontend types.

Works with: pytest (capsys).
Depends on: `app.openapi_export`.
Used by: CI `api` job in `.github/workflows/pr.yml`; `make test-api`; indirectly, the
`contract` CI job and `make client`.
"""

import json

import pytest

from app.openapi_export import main


def test_main_prints_sorted_openapi_json_with_trailing_newline(
    capsys: pytest.CaptureFixture[str],
) -> None:
    """The exported schema is valid JSON ending in a newline (diff/POSIX-tool friendly) and
    includes routes from both the content and attempts routers, not just a stub schema."""
    main()
    captured = capsys.readouterr()

    assert captured.out.endswith("\n")
    schema = json.loads(captured.out)

    assert "/api/v1/lessons/{slug}" in schema["paths"]
    assert "/api/v1/attempts/{attempt_id}/submit" in schema["paths"]
