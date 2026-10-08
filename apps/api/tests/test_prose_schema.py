"""What this file tests: `app.content.prose.validate_prose` — the closed-schema
ProseMirror validator every rich-text field goes through — and the `_candidates()`
schema-path lookup it uses to find `prose-doc.schema.json`.

Used here and why: a shared fixtures file (`packages/schemas/fixtures/prose-doc.json`)
that also seeds other consumers of the schema, so this test and (e.g.) the TS renderer's
own tests stay pinned to the same valid/invalid examples; `monkeypatch` to exercise the
`PROSE_SCHEMA_PATH` env-var override branch of `_candidates()` without touching the real
environment.

How it fits the project: protects ADR-0003 (one closed prose schema shared by the editor,
this validator, the migration tool and the renderer) — every fixture here doubles as a
concrete example of what the schema does and doesn't allow.

Works with: pytest (parametrize), jsonschema (indirectly, via `validate_prose`).
Depends on: `packages/schemas/fixtures/prose-doc.json`; `app.content.prose`.
Used by: CI `api` job in `.github/workflows/pr.yml`; `make test-api`.
"""

import json
from pathlib import Path

import pytest

from app.content.prose import ProseValidationError, validate_prose

# parents[3] from this file (apps/api/tests/) is the monorepo root, so this fixture is
# shared with any other tool that validates against the same schema.
FIXTURES = json.loads(
    (Path(__file__).resolve().parents[3] / "packages/schemas/fixtures/prose-doc.json").read_text()
)


@pytest.mark.parametrize("name", sorted(FIXTURES["valid"]))
def test_valid_documents_pass(name: str) -> None:
    """Every fixture under "valid" must validate cleanly (no raise)."""
    validate_prose(FIXTURES["valid"][name])


@pytest.mark.parametrize("name", sorted(FIXTURES["invalid"]))
def test_invalid_documents_fail(name: str) -> None:
    """Every fixture under "invalid" must be rejected — the schema is closed, so an
    unknown node/mark type or malformed shape can't slip through as "close enough"."""
    with pytest.raises(ProseValidationError):
        validate_prose(FIXTURES["invalid"][name])


def test_error_message_names_the_path() -> None:
    """An `iframe` node (not in the schema) fails inside the doc's `content` array, and
    the raised message must name that path so a caller can locate the bad node."""
    with pytest.raises(ProseValidationError, match="content"):
        validate_prose({"type": "doc", "content": [{"type": "iframe"}]})


@pytest.mark.parametrize("union", ["block", "inline"])
def test_union_type_lists_agree(union: str) -> None:
    """The block/inline unions dispatch on `type` (if/then, not oneOf — see the schema
    package README), so each node type is named in two places: the union's `enum` and its
    if/then entry. They must list the same types, in the same order, and each `then` must
    point at the definition whose `type` const matches its `if`. A type added to only one
    list would be silently unchecked (enum only) or always rejected (if/then only)."""
    from app.content.prose import PROSE_SCHEMA

    defs = PROSE_SCHEMA["$defs"]
    spec = defs[union]
    enum = spec["properties"]["type"]["enum"]
    dispatched = [branch["if"]["properties"]["type"]["const"] for branch in spec["allOf"]]
    assert dispatched == enum
    for branch in spec["allOf"]:
        target = defs[branch["then"]["$ref"].removeprefix("#/$defs/")]
        assert target["properties"]["type"]["const"] == branch["if"]["properties"]["type"]["const"]


def test_env_override_is_first_candidate(monkeypatch: pytest.MonkeyPatch) -> None:
    """`PROSE_SCHEMA_PATH` (the dev-compose bind-mount override) must win over every
    other candidate when set, and every other candidate must still point somewhere
    under `packages/schemas` or `app/schemas` once it's unset."""
    from app.content.prose import _candidates

    # Setting the override env var directly (rather than constructing Settings) mirrors
    # how docker-compose actually injects it for the dev api container.
    monkeypatch.setenv("PROSE_SCHEMA_PATH", "/packages/schemas/prose-doc.schema.json")
    assert _candidates()[0] == Path("/packages/schemas/prose-doc.schema.json")
    monkeypatch.delenv("PROSE_SCHEMA_PATH")
    assert all("packages/schemas" in str(c) or "app/schemas" in str(c) for c in _candidates())
