import pytest

from app.auth.passwords import hash_password, validate_password_strength, verify_password


def test_hash_and_verify_roundtrip() -> None:
    h = hash_password("correct horse battery")
    assert h.startswith("$argon2id$")
    assert verify_password("correct horse battery", h)
    assert not verify_password("wrong", h)


def test_strength_minimum_length() -> None:
    with pytest.raises(ValueError):
        validate_password_strength("short1")
    validate_password_strength("long enough 1")


def test_malformed_stored_hash_is_not_a_crash() -> None:
    assert verify_password("anything", "not-a-valid-argon2-hash") is False
    assert verify_password("anything", "") is False
