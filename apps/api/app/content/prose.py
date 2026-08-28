"""Validates ProseMirror rich-text JSON against the project-wide closed schema.

What this file does: loads `prose-doc.schema.json` once at import time and exposes
`validate_prose()`, which raises `ProseValidationError` if a document is not exactly the
node/mark shape the schema allows.

Used here and why: `jsonschema`'s `Draft202012Validator` with a `FormatChecker` (for the
schema's `https-only` link-href pattern/format checks). The schema is deliberately closed
(no `additionalProperties`) so an unknown node or mark type is rejected outright — this is
what makes rich text safe to render without any HTML sanitisation step: the schema is the
same one the TipTap editor, this validator, the legacy-content migration tool and the
Svelte renderer all share (ADR-0003), so nothing can produce a document only some of them
understand.

How it fits the project: every prose field written through `app.content.importer`
(rich_text block body, question stem/explanation) is validated here before it reaches the
database; a document the schema rejects gets a 422 at import.

Works with:
  Depends on: `packages/schemas/prose-doc.schema.json` (the schema file itself, located via
    `_candidates()`).
  Used by: `app.content.importer` (`_prose()` wraps this for Pydantic field validators);
    `tests/test_prose_schema.py`.
"""

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, FormatChecker


def _candidates() -> list[Path]:
    """Return schema-file locations to try, in order, for the three places this file runs:

    dev compose (bind-mounted source, schema path overridden by an env var), the built
    Docker image (schema copied in next to the app package, see `Dockerfile`), and a plain
    checkout running from the repo (schema still in `packages/schemas/`).
    """
    resolved = Path(__file__).resolve()
    candidates = []
    override = os.environ.get("PROSE_SCHEMA_PATH")
    if (
        override
    ):  # dev compose: the api bind mount hides the image copy, so point at the mounted package
        candidates.append(Path(override))
    # plain repo checkout: walk up from this file to the monorepo root's packages/schemas/.
    # Guarded by the parents-count check so a shallower install (e.g. inside the built
    # image, only 1 level up) doesn't index past the end of resolved.parents.
    if len(resolved.parents) > 4:
        candidates.append(resolved.parents[4] / "packages/schemas/prose-doc.schema.json")
    # built image: Dockerfile copies the schema to app/schemas/ next to this package.
    candidates.append(resolved.parents[1] / "schemas/prose-doc.schema.json")
    return candidates


def _schema_path() -> Path:
    """Return the first candidate path that exists, or raise if none do."""
    candidates = _candidates()
    for candidate in candidates:
        if candidate.exists():
            return candidate
    names = " or ".join(str(c) for c in candidates)
    raise FileNotFoundError(f"prose-doc.schema.json not found at {names}")


# Loaded once at import time; every validator call below reuses this in-memory schema.
PROSE_SCHEMA: dict[str, Any] = json.loads(_schema_path().read_text())


# Raised by `validate_prose` when a document doesn't match the closed prose schema.
class ProseValidationError(ValueError):
    pass


@lru_cache(maxsize=1)
def _validator() -> Draft202012Validator:
    """Build (once, cached) the compiled validator for `PROSE_SCHEMA`."""
    Draft202012Validator.check_schema(PROSE_SCHEMA)
    return Draft202012Validator(PROSE_SCHEMA, format_checker=FormatChecker())


def validate_prose(doc: Any) -> None:
    """Raise ProseValidationError unless `doc` is a document of the closed prose schema."""
    # Only the first error is reported; jsonschema can produce many for one bad document,
    # and one clear message ("path: what's wrong") is more useful to a caller than a dump.
    error = next(iter(_validator().iter_errors(doc)), None)
    if error is not None:
        path = "/".join(str(p) for p in error.absolute_path) or "<root>"
        raise ProseValidationError(f"{path}: {error.message}")
