import uuid
from functools import lru_cache
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "My Reading Tracker API"
    app_env: Literal["development", "test", "production"] = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = Field(
        default="postgresql+psycopg://my_reading_tracker:my_reading_tracker_local@localhost:5432/my_reading_tracker"
    )
    cors_origins: str = "http://localhost:5173"
    log_level: str = "INFO"
    supabase_url: str = ""
    supabase_jwt_issuer: str = ""
    supabase_jwks_url: str = ""
    supabase_jwt_audience: str = "authenticated"
    dev_auth_bypass: bool = False
    dev_auth_user_id: uuid.UUID = uuid.UUID("00000000-0000-4000-8000-000000000001")
    dev_auth_email: str = "developer@localhost"

    @model_validator(mode="after")
    def prevent_production_auth_bypass(self) -> "Settings":
        if self.dev_auth_bypass and self.app_env != "development":
            raise ValueError("DEV_AUTH_BYPASS is allowed only when APP_ENV=development")
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [
            origin.strip() for origin in self.cors_origins.split(",") if origin.strip()
        ]

    @property
    def auth_issuer(self) -> str:
        if self.supabase_jwt_issuer:
            return self.supabase_jwt_issuer.rstrip("/")
        if self.supabase_url:
            return f"{self.supabase_url.rstrip('/')}/auth/v1"
        raise ValueError("SUPABASE_URL or SUPABASE_JWT_ISSUER must be configured")

    @property
    def auth_jwks_url(self) -> str:
        if self.supabase_jwks_url:
            return self.supabase_jwks_url
        return f"{self.auth_issuer}/.well-known/jwks.json"


@lru_cache
def get_settings() -> Settings:
    return Settings()
