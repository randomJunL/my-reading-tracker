"""Run browser tests against a disposable migrated PostgreSQL database."""

from __future__ import annotations

import os
import shutil
import subprocess
import time
import uuid
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL, make_url

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
PYTHON = ROOT / ".venv" / "bin" / "python"
LOCAL_PNPM = ROOT / ".tools" / "pnpm" / "node_modules" / ".bin" / "pnpm"
DEFAULT_DATABASE_URL = (
    "postgresql+psycopg://my_reading_tracker:my_reading_tracker_local@"
    "127.0.0.1:5432/my_reading_tracker"
)


def main() -> None:
    base_url = make_url(os.environ.get("DATABASE_URL", DEFAULT_DATABASE_URL))
    database_name = f"my_reading_tracker_e2e_{uuid.uuid4().hex}"
    admin_engine = create_engine(base_url.set(database="postgres"))
    test_url = base_url.set(database=database_name)
    backend_process: subprocess.Popen[bytes] | None = None

    try:
        with admin_engine.connect().execution_options(
            isolation_level="AUTOCOMMIT"
        ) as connection:
            connection.execute(text(f'CREATE DATABASE "{database_name}"'))
        _migrate(test_url)
        _run_playwright(auth_bypass=False, frontend_port=5180, api_port=8010)
        backend_process = _start_backend(test_url, frontend_port=5181, api_port=8010)
        _wait_for_health(8010)
        _run_playwright(auth_bypass=True, frontend_port=5181, api_port=8010)
    finally:
        if backend_process is not None:
            backend_process.terminate()
            try:
                backend_process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                backend_process.kill()
                backend_process.wait(timeout=5)
        with admin_engine.connect().execution_options(
            isolation_level="AUTOCOMMIT"
        ) as connection:
            connection.execute(
                text(
                    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
                    "WHERE datname = :database_name AND pid <> pg_backend_pid()"
                ),
                {"database_name": database_name},
            )
            connection.execute(text(f'DROP DATABASE IF EXISTS "{database_name}"'))
        admin_engine.dispose()


def _migrate(database_url: URL) -> None:
    config = Config(BACKEND / "alembic.ini")
    config.set_main_option("script_location", str(BACKEND / "migrations"))
    config.set_main_option("sqlalchemy.url", database_url.render_as_string(False))
    command.upgrade(config, "head")
    command.check(config)


def _start_backend(
    database_url: URL, *, frontend_port: int, api_port: int
) -> subprocess.Popen[bytes]:
    environment = os.environ.copy()
    environment.update(
        {
            "APP_ENV": "development",
            "DATABASE_URL": database_url.render_as_string(False),
            "DEV_AUTH_BYPASS": "true",
            "DEV_AUTH_USER_ID": "00000000-0000-4000-8000-000000000099",
            "DEV_AUTH_EMAIL": "e2e@localhost",
            "CORS_ORIGINS": f"http://127.0.0.1:{frontend_port}",
            "LOG_LEVEL": "WARNING",
        }
    )
    return subprocess.Popen(
        [
            str(PYTHON),
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(api_port),
        ],
        cwd=BACKEND,
        env=environment,
    )


def _wait_for_health(api_port: int) -> None:
    health_url = f"http://127.0.0.1:{api_port}/api/v1/health"
    deadline = time.monotonic() + 20
    while time.monotonic() < deadline:
        try:
            with urlopen(health_url, timeout=1) as response:
                if response.status == 200:
                    return
        except (URLError, TimeoutError):
            time.sleep(0.25)
    raise RuntimeError("E2E FastAPI server did not become healthy")


def _run_playwright(*, auth_bypass: bool, frontend_port: int, api_port: int) -> None:
    pnpm = str(LOCAL_PNPM) if LOCAL_PNPM.exists() else shutil.which("pnpm")
    if not pnpm:
        raise RuntimeError("pnpm is required for end-to-end tests")
    environment = os.environ.copy()
    environment.update(
        {
            "E2E_AUTH_BYPASS": str(auth_bypass).lower(),
            "PLAYWRIGHT_PORT": str(frontend_port),
            "PLAYWRIGHT_API_PORT": str(api_port),
        }
    )
    subprocess.run(
        [pnpm, "--dir", str(FRONTEND), "exec", "playwright", "test"],
        cwd=ROOT,
        env=environment,
        check=True,
    )


if __name__ == "__main__":
    main()
