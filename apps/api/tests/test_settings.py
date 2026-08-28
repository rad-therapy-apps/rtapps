"""What this file tests: `app.config.Settings` — its dev/test-only relaxations, the
prod-only secret-strength validator, and the `env`-derived `cookie_secure` property.

Used here and why: constructs `Settings` directly with explicit kwargs (no environment
variables, no `.env` file) so each case is a pure function of its inputs, independent of
whatever `.env` happens to exist on a given machine.

How it fits the project: protects the "never boot prod with a weak or placeholder
secret" guard from ADR-0002/`app/config.py` — the only thing standing between a real
deployment and shipping with `DEFAULT_DEV_SECRET` or a too-short session-signing key.

Works with: pytest, pydantic.
Depends on: `app.config.Settings`.
Used by: CI `api` job in `.github/workflows/pr.yml`; `make test-api`.
"""

import pytest
from pydantic import ValidationError

from app.config import Settings


def test_dev_allows_default_secret() -> None:
    """env="dev" is exempt from the secret-strength check, and dev cookies aren't Secure
    (so they work over plain http on localhost)."""
    s = Settings(env="dev")
    assert s.session_secret.startswith("dev-only")
    assert s.cookie_secure is False


def test_prod_rejects_default_or_short_secret() -> None:
    """Outside dev/test, both the placeholder default secret and an explicit short one
    are rejected; a genuinely long secret is accepted and forces Secure cookies."""
    with pytest.raises(ValidationError):
        Settings(env="prod")  # falls back to DEFAULT_DEV_SECRET, which prod must refuse
    with pytest.raises(ValidationError):
        Settings(env="prod", session_secret="short")  # below the 32-char minimum
    s = Settings(env="prod", session_secret="x" * 32)
    assert s.cookie_secure is True


def test_unknown_env_rejected() -> None:
    """`env` is a closed Literal["dev", "test", "prod"] — anything else fails validation
    up front rather than silently falling through to dev/prod-like behaviour."""
    with pytest.raises(ValidationError):
        Settings(env="staging")
