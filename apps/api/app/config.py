from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    env: str = "dev"
    log_level: str = "info"
    public_origin: str = "http://localhost:8080"
    database_url: str = "postgresql+asyncpg://rtapps:rtapps@localhost:5432/rtapps"
    session_secret: str = "dev-only-secret-change-me"
    s3_endpoint: str = "http://localhost:9000"
    s3_access_key: str = "rtapps"
    s3_secret_key: str = "rtapps-secret"
    s3_bucket: str = "rtapps-media"


@lru_cache
def get_settings() -> Settings:
    return Settings()
