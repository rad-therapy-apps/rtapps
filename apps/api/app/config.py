from functools import lru_cache
from typing import Literal, Self

from fastapi import Request
from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_DEV_SECRET = "dev-only-secret-change-me"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    env: Literal["dev", "test", "prod"] = "dev"
    log_level: str = "info"
    public_origin: str = "http://localhost:8080"
    database_url: str = "postgresql+asyncpg://rtapps:rtapps@localhost:5432/rtapps"
    session_secret: str = DEFAULT_DEV_SECRET
    session_days: int = Field(default=14, ge=1, le=90)
    s3_endpoint: str = "http://localhost:9000"
    s3_access_key: str = "rtapps"
    s3_secret_key: str = "rtapps-secret"
    s3_bucket: str = "rtapps-media"
    google_client_id: str = ""
    google_client_secret: str = ""

    @property
    def cookie_secure(self) -> bool:
        return self.env != "dev"

    @property
    def google_enabled(self) -> bool:
        return bool(self.google_client_id and self.google_client_secret)

    @model_validator(mode="after")
    def _secret_is_safe_outside_dev(self) -> Self:
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
    settings: Settings = request.app.state.settings
    return settings
