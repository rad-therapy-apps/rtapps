import json
from pathlib import Path

import pytest

from app.content.prose import ProseValidationError, validate_prose

FIXTURES = json.loads(
    (Path(__file__).resolve().parents[3] / "packages/schemas/fixtures/prose-doc.json").read_text()
)


@pytest.mark.parametrize("name", sorted(FIXTURES["valid"]))
def test_valid_documents_pass(name: str) -> None:
    validate_prose(FIXTURES["valid"][name])


@pytest.mark.parametrize("name", sorted(FIXTURES["invalid"]))
def test_invalid_documents_fail(name: str) -> None:
    with pytest.raises(ProseValidationError):
        validate_prose(FIXTURES["invalid"][name])


def test_error_message_names_the_path() -> None:
    with pytest.raises(ProseValidationError, match="content"):
        validate_prose({"type": "doc", "content": [{"type": "iframe"}]})


def test_env_override_is_first_candidate(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.content.prose import _candidates

    monkeypatch.setenv("PROSE_SCHEMA_PATH", "/packages/schemas/prose-doc.schema.json")
    assert _candidates()[0] == Path("/packages/schemas/prose-doc.schema.json")
    monkeypatch.delenv("PROSE_SCHEMA_PATH")
    assert all("packages/schemas" in str(c) or "app/schemas" in str(c) for c in _candidates())
