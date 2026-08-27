import uuid
from functools import lru_cache
from typing import Literal
from urllib.parse import urlsplit

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
    frontend_url: str = "http://localhost:5173"
    log_level: str = "INFO"
    supabase_url: str = ""
    supabase_secret_key: str = ""
    supabase_jwt_issuer: str = ""
    supabase_jwks_url: str = ""
    supabase_jwt_audience: str = "authenticated"
    dev_auth_bypass: bool = False
    dev_auth_user_id: uuid.UUID = uuid.UUID("00000000-0000-4000-8000-000000000001")
    dev_auth_email: str = "developer@localhost"
    google_books_api_key: str = ""
    open_library_contact_email: str = ""
    book_provider_timeout_seconds: float = Field(default=4.0, gt=0, le=30)
    book_provider_max_retries: int = Field(default=1, ge=0, le=3)
    book_search_cache_ttl_seconds: int = Field(default=300, ge=0, le=3600)

    @model_validator(mode="after")
    def prevent_production_auth_bypass(self) -> "Settings":
        if self.dev_auth_bypass and self.app_env != "development":
            raise ValueError("DEV_AUTH_BYPASS is allowed only when APP_ENV=development")
        return self

    @model_validator(mode="after")
    def validate_production_configuration(self) -> "Settings":
        if self.app_env != "production":
            return self

        problems: list[str] = []
        if not (self.supabase_url or self.supabase_jwt_issuer):
            problems.append("Supabase authentication is not configured")
        if not self.supabase_secret_key:
            problems.append("SUPABASE_SECRET_KEY is required for reader invitations")

        database = urlsplit(self.database_url)
        if not database.scheme.startswith("postgresql"):
            problems.append("DATABASE_URL must use PostgreSQL")
        if database.hostname in {None, "localhost", "127.0.0.1", "::1"}:
            problems.append("DATABASE_URL must not point to localhost")

        origins = self.cors_origin_list
        if not origins:
            problems.append("CORS_ORIGINS must contain the production frontend")
        for origin in origins:
            parsed = urlsplit(origin)
            if (
                parsed.scheme != "https"
                or not parsed.netloc
                or parsed.hostname in {"localhost", "127.0.0.1", "::1"}
                or "*" in origin
                or parsed.path not in {"", "/"}
                or parsed.query
                or parsed.fragment
            ):
                problems.append(
                    "CORS_ORIGINS must contain only exact HTTPS production origins"
                )
                break

        frontend = urlsplit(self.frontend_url)
        if (
            frontend.scheme != "https"
            or not frontend.netloc
            or frontend.hostname in {"localhost", "127.0.0.1", "::1"}
            or frontend.path not in {"", "/"}
            or frontend.query
            or frontend.fragment
        ):
            problems.append("FRONTEND_URL must be an exact production HTTPS origin")

        if problems:
            raise ValueError("Invalid production configuration: " + "; ".join(problems))
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
