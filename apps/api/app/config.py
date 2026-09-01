"""Application configuration, loaded once from environment variables / `.env`.

What this file does: defines the `Settings` model (environment, database URL, session
cookie lifetime, S3/object-storage and Google OAuth credentials) and two ways to obtain
it — a process-wide cached singleton and a FastAPI dependency that reads it off
`app.state`.

Used here and why: `pydantic-settings` (`BaseSettings`) so every setting is validated and
type-checked at startup instead of read ad-hoc with `os.environ`; `functools.lru_cache` so
the `.env` file is parsed only once per process, not on every request.

How it fits the project: read by `app/main.py` at startup (`load_settings()`) and stored on
`app.state.settings`; almost every other module in `app/` depends on `Settings` for its
environment-dependent behaviour (cookie security, allowed origin, database URL). See
`docs/03-architecture.md` §10 for the dev/test/prod environments this distinguishes.

Depends on: nothing in-repo.
Used by: `app/db.py`, `app/csrf.py`, `app/openapi_export.py`, `app/main.py`, `app/seed.py`,
`app/auth/deps.py`, `app/auth/google.py`, `app/auth/router.py`, `app/content/importer.py`,
and most of `tests/` (`conftest.py`, `test_csrf.py`, `test_errors.py`, `test_seed.py`,
`test_settings.py`, `test_google.py`).
"""

from functools import lru_cache
from typing import Literal, Self

from fastapi import Request
from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Placeholder secret; the validator below refuses to boot with this value outside dev/test.
DEFAULT_DEV_SECRET = "dev-only-secret-change-me"


class Settings(BaseSettings):
    # Fields are read from environment variables (case-insensitive) and then from `.env`;
    # unrecognised env vars are ignored rather than raising, so unrelated env vars in the
    # same process/.env file don't break startup.
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Distinguishes dev / test / prod: "test" is exempted from the Origin-header
    # requirement in app.csrf, and both "dev" and "test" skip the secret-strength check
    # in the validator below.
    env: Literal["dev", "test", "prod"] = "dev"
    log_level: str = "info"
    # The single allowed browser Origin; app.csrf.OriginCheckMiddleware rejects any
    # mutating request whose Origin header doesn't match this (CSRF defence, ADR-0002).
    public_origin: str = "http://localhost:8080"
    database_url: str = "postgresql+asyncpg://rtapps:rtapps@localhost:5432/rtapps"
    # Signs the OAuth "state" cookie (app.auth.google); validated below to be a real
    # random value (not this placeholder) outside dev/test.
    session_secret: str = DEFAULT_DEV_SECRET
    session_days: int = Field(default=14, ge=1, le=90)  # session cookie lifetime, sliding expiry
    s3_endpoint: str = "http://localhost:9000"
    s3_access_key: str = "rtapps"
    s3_secret_key: str = "rtapps-secret"
    s3_bucket: str = "rtapps-media"
    google_client_id: str = ""
    google_client_secret: str = ""
    rate_limit_enabled: bool = True

    @property
    def cookie_secure(self) -> bool:
        # Secure=True (HTTPS-only cookie) everywhere except local dev, per ADR-0002.
        return self.env != "dev"

    @property
    def google_enabled(self) -> bool:
        # Google sign-in is offered only when both OAuth credentials are configured.
        return bool(self.google_client_id and self.google_client_secret)

    @model_validator(mode="after")
    def _secret_is_safe_outside_dev(self) -> Self:
        # Guard against ever booting a prod deployment with the placeholder dev secret, or
        # one too short to be a safe token/cookie signing key.
        if self.env in ("dev", "test"):
            return self
        if self.session_secret == DEFAULT_DEV_SECRET or len(self.session_secret) < 32:
            raise ValueError(
                "SESSION_SECRET must be set to a random value of at least 32 characters"
            )
        return self


@lru_cache
def load_settings() -> Settings:
    """Read settings from the environment once (process-wide)."""
    return Settings()


def get_settings(request: Request) -> Settings:
    # FastAPI dependency: reads back the Settings instance app.main stored on app.state at
    # startup, so tests can override it per-app without touching the lru_cache singleton
    # above.
    settings: Settings = request.app.state.settings
    return settings
