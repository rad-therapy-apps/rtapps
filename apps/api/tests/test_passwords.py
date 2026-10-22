"""What this file tests: `app/auth/passwords.py` — argon2 hashing/verification and the
password-strength gate used by registration.

Used here and why: plain synchronous unit tests, no app/database needed — these functions
are pure with respect to their inputs (aside from argon2's internal salt).

How it fits the project: this is the only place plaintext passwords are ever hashed or
compared; `app.auth.router.register`/`login` both call straight into it.

Works with: pytest.
Depends on: `app.auth.passwords`.
Used by: CI `api` job in `.github/workflows/pr.yml`; `make test-api`.
"""

import pytest

from app.auth.passwords import (
    MIN_PASSWORD_LENGTH,
    hash_password,
    validate_password_strength,
    verify_password,
)
from app.auth.schemas import ChangePasswordIn, RegisterIn


def test_hash_and_verify_roundtrip() -> None:
    """A hashed password uses argon2id, verifies against its own plaintext, and rejects others."""
    h = hash_password("correct horse battery")
    assert h.startswith("$argon2id$")
    assert verify_password("correct horse battery", h)
    assert not verify_password("wrong", h)


def test_strength_minimum_length() -> None:
    """Passwords under the minimum length are rejected; long-enough ones pass silently."""
    with pytest.raises(ValueError):
        validate_password_strength("short1")
    validate_password_strength("long enough 1")


def test_malformed_stored_hash_is_not_a_crash() -> None:
    """A corrupted or empty stored hash (e.g. a data issue) fails verification cleanly
    instead of raising — login must return 401, not 500, for a broken stored hash."""
    assert verify_password("anything", "not-a-valid-argon2-hash") is False
    assert verify_password("anything", "") is False


@pytest.mark.parametrize(
    ("model", "field"), [(RegisterIn, "password"), (ChangePasswordIn, "new_password")]
)
def test_password_schemas_use_the_shared_minimum(model: type, field: str) -> None:
    """#152: the request schemas must enforce MIN_PASSWORD_LENGTH itself, not a copy of its value.
    If they drifted below it, a too-short change-password request would pass the schema and reach
    validate_password_strength's ValueError, which has no handler (a 500)."""
    schema = model.model_json_schema()["properties"][field]
    assert schema["minLength"] == MIN_PASSWORD_LENGTH
