import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_cors_origins_are_split_and_trimmed() -> None:
    settings = Settings(
        _env_file=None,
        cors_origins="http://localhost:5173, https://example.com",
    )

    assert settings.cors_origin_list == [
        "http://localhost:5173",
        "https://example.com",
    ]


def test_supabase_auth_addresses_are_derived_from_project_url() -> None:
    settings = Settings(
        _env_file=None,
        supabase_url="https://project.supabase.co/",
    )

    assert settings.auth_issuer == "https://project.supabase.co/auth/v1"
    assert (
        settings.auth_jwks_url
        == "https://project.supabase.co/auth/v1/.well-known/jwks.json"
    )


@pytest.mark.parametrize("app_env", ["test", "production"])
def test_auth_bypass_is_rejected_outside_development(app_env: str) -> None:
    with pytest.raises(ValidationError, match="DEV_AUTH_BYPASS"):
        Settings(
            _env_file=None,
            app_env=app_env,
            dev_auth_bypass=True,
        )


def test_production_requires_remote_database_auth_and_exact_https_cors() -> None:
    with pytest.raises(ValidationError, match="Invalid production configuration"):
        Settings(
            _env_file=None,
            app_env="production",
        )


def test_production_rejects_wildcard_or_local_cors() -> None:
    with pytest.raises(ValidationError, match="exact HTTPS production origins"):
        Settings(
            _env_file=None,
            app_env="production",
            database_url="postgresql+psycopg://user:password@db.example.com/app",
            cors_origins="https://*.example.com,http://localhost:5173",
            supabase_url="https://project.supabase.co",
        )


def test_valid_production_configuration_is_accepted() -> None:
    settings = Settings(
        _env_file=None,
        app_env="production",
        database_url="postgresql+psycopg://user:password@db.example.com/app",
        cors_origins="https://reading.example.com",
        supabase_url="https://project.supabase.co",
    )

    assert settings.app_env == "production"
