import uuid
from collections.abc import Generator
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.core.config import get_settings

BACKEND_DIR = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="session")
def migrated_database_engine() -> Generator[Engine, None, None]:
    base_url = make_url(get_settings().database_url)
    database_name = f"my_reading_tracker_test_{uuid.uuid4().hex}"
    admin_url = base_url.set(database="postgres")
    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")

    try:
        with admin_engine.connect() as connection:
            connection.execute(text(f'CREATE DATABASE "{database_name}"'))
    except OperationalError as error:
        admin_engine.dispose()
        pytest.skip(f"PostgreSQL is required for database integration tests: {error}")

    test_url = base_url.set(database=database_name)
    engine: Engine | None = None

    try:
        alembic_config = Config(BACKEND_DIR / "alembic.ini")
        alembic_config.set_main_option(
            "script_location", str(BACKEND_DIR / "migrations")
        )
        alembic_config.set_main_option(
            "sqlalchemy.url", test_url.render_as_string(False)
        )
        command.upgrade(alembic_config, "head")
        command.check(alembic_config)
        engine = create_engine(test_url)
        yield engine
    finally:
        if engine is not None:
            engine.dispose()
        with admin_engine.connect() as connection:
            connection.execute(
                text(
                    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
                    "WHERE datname = :database_name AND pid <> pg_backend_pid()"
                ),
                {"database_name": database_name},
            )
            connection.execute(text(f'DROP DATABASE "{database_name}"'))
        admin_engine.dispose()


@pytest.fixture
def db_session(migrated_database_engine: Engine) -> Generator[Session, None, None]:
    with Session(migrated_database_engine, expire_on_commit=False) as session:
        yield session
        session.rollback()
