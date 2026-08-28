import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, FormatChecker


def _candidates() -> list[Path]:
    resolved = Path(__file__).resolve()
    candidates = []
    if len(resolved.parents) > 4:
        candidates.append(resolved.parents[4] / "packages/schemas/prose-doc.schema.json")
    candidates.append(resolved.parents[1] / "schemas/prose-doc.schema.json")
    return candidates


def _schema_path() -> Path:
    candidates = _candidates()
    for candidate in candidates:
        if candidate.exists():
            return candidate
    names = " or ".join(str(c) for c in candidates)
    raise FileNotFoundError(f"prose-doc.schema.json not found at {names}")


PROSE_SCHEMA: dict[str, Any] = json.loads(_schema_path().read_text())


class ProseValidationError(ValueError):
    pass


@lru_cache(maxsize=1)
def _validator() -> Draft202012Validator:
    Draft202012Validator.check_schema(PROSE_SCHEMA)
    return Draft202012Validator(PROSE_SCHEMA, format_checker=FormatChecker())


def validate_prose(doc: Any) -> None:
    """Raise ProseValidationError unless `doc` is a document of the closed prose schema."""
    error = next(iter(_validator().iter_errors(doc)), None)
    if error is not None:
        path = "/".join(str(p) for p in error.absolute_path) or "<root>"
        raise ProseValidationError(f"{path}: {error.message}")
