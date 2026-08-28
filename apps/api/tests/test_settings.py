import pytest
from pydantic import ValidationError

from app.config import Settings


def test_dev_allows_default_secret() -> None:
    s = Settings(env="dev")
    assert s.session_secret.startswith("dev-only")
    assert s.cookie_secure is False


def test_prod_rejects_default_or_short_secret() -> None:
    with pytest.raises(ValidationError):
        Settings(env="prod")
    with pytest.raises(ValidationError):
        Settings(env="prod", session_secret="short")
    s = Settings(env="prod", session_secret="x" * 32)
    assert s.cookie_secure is True


def test_unknown_env_rejected() -> None:
    with pytest.raises(ValidationError):
        Settings(env="staging")
