"""Apply production migrations and verify the resulting schema."""

from pathlib import Path

from alembic import command
from alembic.config import Config

from app.core.config import get_settings

BACKEND = Path(__file__).resolve().parents[1]


def main() -> None:
    settings = get_settings()
    if settings.app_env != "production":
        raise SystemExit(
            "Production migrations require APP_ENV=production. "
            "Use the normal development migration command locally."
        )

    config = Config(BACKEND / "alembic.ini")
    config.set_main_option("script_location", str(BACKEND / "migrations"))
    config.set_main_option("sqlalchemy.url", settings.database_url.replace("%", "%%"))
    command.upgrade(config, "head")
    command.check(config)


if __name__ == "__main__":
    main()
