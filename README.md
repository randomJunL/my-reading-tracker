# My Reading Tracker

My Reading Tracker is the stable internal name for a private family website
that logs children's books, reading sessions, and progress over time. Its
user-facing name is configured separately with `VITE_APP_NAME`.

## Current status

Steps 1 through 5 are established: the application and database schema are
scaffolded, and Supabase magic-link authentication protects the React routes
and household-scoped FastAPI API.

The full roadmap is in [PROJECT_PLAN.md](PROJECT_PLAN.md).

## Architecture

```text
React + TypeScript website -> FastAPI REST API -> PostgreSQL
                                   |
                                   +-> Google Books / Open Library
```

Supabase provides authentication and will provide hosted PostgreSQL in deployed
environments. Local development uses PostgreSQL in Docker while authenticating
against a configured Supabase development project.

## Prerequisites

- Node.js 24 LTS
- pnpm 10
- Python 3.12
- Docker Desktop with Docker Compose
- Git

## First-time local setup

```bash
export PATH="$PWD/.tools/node/bin:$PWD/.tools/pnpm/node_modules/.bin:$PATH"
make doctor
make setup
make db-up
make db-status
make backend-check
make backend-dev
```

In a second terminal, start the website:

```bash
make frontend-dev
```

Local PostgreSQL is available at `localhost:5432` using the development values
in `.env`. The `.env` file is ignored by Git; update `.env.example` whenever a
new configuration key is introduced.

The project-local Node.js and pnpm installations live under the ignored
`.tools` directory, so they do not replace system-wide versions.

Stop local services with:

```bash
make db-down
```

The FastAPI health check is available at
`http://localhost:8000/api/v1/health` while `make backend-dev` is running.
The website is available at `http://localhost:5173` while `make frontend-dev`
is running.

See [docs/development.md](docs/development.md) for detailed development and
troubleshooting instructions.

## Repository layout

```text
frontend/             React website (Step 3)
backend/              FastAPI application (Step 2)
docs/                 Architecture and development documentation
docker-compose.yml    Local supporting services
Makefile              Common development commands
```

## Project principles

- Keep the backend as a modular monolith.
- Put business rules and authorization in FastAPI.
- Keep secrets and provider keys out of browser code.
- Treat migrations as the source of truth for the database schema.
- Generate the frontend API client from FastAPI's OpenAPI contract.
- Build the primary reading-log workflow before optional features.
