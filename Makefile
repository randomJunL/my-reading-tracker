.DEFAULT_GOAL := help

LOCAL_NODE := $(CURDIR)/.tools/node/bin/node
LOCAL_NPM := $(CURDIR)/.tools/node/bin/npm
LOCAL_PNPM := $(CURDIR)/.tools/pnpm/node_modules/.bin/pnpm

.PHONY: help doctor setup api-generate backend-install backend-dev backend-format \
	backend-lint backend-typecheck backend-test backend-check backend-migrate \
	backend-migration backend-docker-build frontend-install frontend-dev \
	frontend-format frontend-lint frontend-test frontend-build frontend-check \
	frontend-e2e db-up db-down db-status db-logs db-shell db-reset

help:
	@echo "My Reading Tracker local development commands"
	@echo ""
	@echo "  make doctor     Check required local tools"
	@echo "  make setup      Create local configuration and Python environment"
	@echo "  make api-generate Generate frontend API types from FastAPI OpenAPI"
	@echo "  make backend-dev    Run FastAPI with automatic reload"
	@echo "  make backend-check  Run backend formatting, linting, types, and tests"
	@echo "  make backend-migrate Apply pending database migrations"
	@echo "  make frontend-dev   Run the React website with automatic reload"
	@echo "  make frontend-check Run frontend formatting, linting, tests, and build"
	@echo "  make db-up      Start local PostgreSQL and wait until healthy"
	@echo "  make db-down    Stop local PostgreSQL"
	@echo "  make db-status  Show local service status"
	@echo "  make db-logs    Follow PostgreSQL logs"
	@echo "  make db-shell   Open a PostgreSQL shell"
	@echo "  make db-reset   Delete and recreate local PostgreSQL data"

doctor:
	@echo "Expected Node.js: 24 LTS"
	@$(LOCAL_NODE) --version
	@echo "Expected pnpm: 10.x"
	@PATH="$(CURDIR)/.tools/node/bin:$$PATH" $(LOCAL_PNPM) --version
	@echo "Expected Python: 3.12.x"
	@python3 --version
	@docker --version
	@docker compose version
	@git --version

setup:
	@test -x $(LOCAL_NODE) || (echo "Local Node.js is missing; see docs/development.md" && exit 1)
	@test -x $(LOCAL_PNPM) || (echo "Local pnpm is missing; see docs/development.md" && exit 1)
	@test -f .env || cp .env.example .env
	@test -d .venv || python3 -m venv .venv
	@$(MAKE) backend-install
	@$(MAKE) frontend-install
	@docker compose config --quiet
	@echo "Local configuration is ready. Run 'make db-up' to start PostgreSQL."

api-generate:
	@cd backend && ../.venv/bin/python scripts/export_openapi.py
	@PATH="$(CURDIR)/.tools/node/bin:$$PATH" $(LOCAL_PNPM) --dir frontend api:generate

backend-install:
	@.venv/bin/python -m pip install --editable "backend[dev]"

backend-dev:
	@cd backend && ../.venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

backend-format:
	@.venv/bin/python -m ruff format backend

backend-lint:
	@.venv/bin/python -m ruff format --check backend
	@.venv/bin/python -m ruff check backend

backend-typecheck:
	@cd backend && ../.venv/bin/python -m mypy .

backend-test:
	@cd backend && APP_ENV=test DEV_AUTH_BYPASS=false ../.venv/bin/python -m pytest

backend-check: backend-lint backend-typecheck backend-test

backend-migrate:
	@cd backend && ../.venv/bin/python -m alembic upgrade head

backend-migration:
	@test -n "$(message)" || (echo 'Usage: make backend-migration message="describe the change"' && exit 1)
	@cd backend && ../.venv/bin/python -m alembic revision --autogenerate -m "$(message)"

backend-docker-build:
	@docker build --file backend/Dockerfile --tag my-reading-tracker-backend backend

frontend-install:
	@PATH="$(CURDIR)/.tools/node/bin:$$PATH" $(LOCAL_PNPM) install --frozen-lockfile

frontend-dev:
	@PATH="$(CURDIR)/.tools/node/bin:$$PATH" $(LOCAL_PNPM) --dir frontend dev

frontend-format:
	@PATH="$(CURDIR)/.tools/node/bin:$$PATH" $(LOCAL_PNPM) --dir frontend format

frontend-lint:
	@PATH="$(CURDIR)/.tools/node/bin:$$PATH" $(LOCAL_PNPM) --dir frontend format:check
	@PATH="$(CURDIR)/.tools/node/bin:$$PATH" $(LOCAL_PNPM) --dir frontend lint

frontend-test:
	@PATH="$(CURDIR)/.tools/node/bin:$$PATH" $(LOCAL_PNPM) --dir frontend test

frontend-build:
	@PATH="$(CURDIR)/.tools/node/bin:$$PATH" $(LOCAL_PNPM) --dir frontend build

frontend-check: frontend-lint frontend-test frontend-build

frontend-e2e:
	@PATH="$(CURDIR)/.tools/node/bin:$$PATH" .venv/bin/python backend/scripts/run_e2e.py

db-up:
	@docker compose up --detach --wait postgres

db-down:
	@docker compose down

db-status:
	@docker compose ps

db-logs:
	@docker compose logs --follow postgres

db-shell:
	@docker compose exec postgres sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"'

db-reset:
	@echo "Deleting local My Reading Tracker database data..."
	@docker compose down --volumes
	@docker compose up --detach --wait postgres
