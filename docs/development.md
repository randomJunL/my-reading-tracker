# Local development

## Supported toolchain

My Reading Tracker pins major runtime versions so local development and deployment use
compatible environments:

- Node.js 24 LTS, declared in `.nvmrc`
- pnpm 10, declared in the root `package.json`
- Python 3.12, declared in `.python-version`
- PostgreSQL 17, declared in `docker-compose.yml`

Run `make doctor` to display the installed versions.

The initial setup installs Node.js and pnpm under the ignored `.tools`
directory. When working on the frontend, place them first on the current
shell's path:

```bash
export PATH="$PWD/.tools/node/bin:$PWD/.tools/pnpm/node_modules/.bin:$PATH"
```

This project-local toolchain avoids changing Node.js installations used by
other projects on the computer.

## Environment configuration

`.env.example` documents every supported configuration key. Local development
uses `.env`, which is ignored by Git.

When adding a new key:

1. Add a safe placeholder or local default to `.env.example`.
2. Add the local value to `.env`.
3. Document which application consumes the key.
4. Never commit passwords, private keys, or production tokens.

Only variables beginning with `VITE_` may be exposed to frontend browser code.
Database credentials and the Google Books API key belong in the backend.

## Book-provider configuration

Book search uses Google Books first and Open Library as a fallback. Add the
backend-only provider values to the ignored `.env` file:

```dotenv
GOOGLE_BOOKS_API_KEY=YOUR_RESTRICTED_GOOGLE_BOOKS_KEY
OPEN_LIBRARY_CONTACT_EMAIL=you@example.com
BOOK_PROVIDER_TIMEOUT_SECONDS=4
BOOK_PROVIDER_MAX_RETRIES=1
BOOK_SEARCH_CACHE_TTL_SECONDS=300
```

Restrict the Google key to the Books API before using it outside local
development. If the key is blank, FastAPI skips Google Books and searches Open
Library directly. Set the contact email so Open Library can identify and
contact the application if its traffic causes a problem.

Provider requests originate only from FastAPI. Keys, upstream URLs, and raw
provider errors are never included in browser responses. Search results and
empty searches are cached in memory for the configured TTL; the cache is local
to each backend process and does not require a database migration.

The Library screen uses the selected reader in the application header. Search
results are reviewed and editable before they are persisted in PostgreSQL; the
manual-entry path uses the same form without calling an external provider. A
single household book can be assigned to multiple readers with different
reading statuses.

The header's **Log reading** action opens the quick-entry screen for the
selected reader. Today, the first library book, and independent reading are
preselected so a normal entry only requires the number of minutes. The History
screen supports correction and confirmed deletion of individual entries.

## Supabase Auth configuration

Create or select a Supabase development project and enable email authentication.
My Reading Tracker uses passwordless magic links. In the Supabase Auth URL
configuration, set the local site URL to `http://localhost:5173` and allow that
same address as a redirect URL.

Copy these public project values into `.env`:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
```

FastAPI derives the expected issuer and JWKS endpoint from `SUPABASE_URL` and
accepts only authenticated access tokens signed with the project's asymmetric
key. If necessary, `SUPABASE_JWT_ISSUER` and `SUPABASE_JWKS_URL` can override
the derived addresses. Do not configure a JWT secret or Supabase secret key.

After both applications start, visit `http://localhost:5173/sign-in`. The first
successful authenticated call to `/api/v1/me` creates the user's household and
owner membership in the configured PostgreSQL database.

### Development-only authentication bypass

For routine local feature work, authentication can be bypassed without sending
Supabase email. Enable both gates only in the ignored local `.env` file:

```dotenv
APP_ENV=development
DEV_AUTH_BYPASS=true
DEV_AUTH_USER_ID=00000000-0000-4000-8000-000000000001
DEV_AUTH_EMAIL=developer@localhost
VITE_DEV_AUTH_BYPASS=true
```

Restart both development servers after changing these values. Vite honors the
bypass only while running its development server, and FastAPI rejects any
configuration that enables the bypass when `APP_ENV` is `test` or `production`.
The fixed local identity still calls `/api/v1/me` and receives a normal owner
membership, so household-scoped application behavior remains active.

Set both bypass flags to `false` when testing the real Supabase sign-in flow.

## Python environment

`make setup` creates a standard virtual environment at `.venv`. Activate it in
the current shell with:

```bash
source .venv/bin/activate
```

`make setup` installs the backend and its development dependencies into the
virtual environment. To refresh them after `backend/pyproject.toml` changes,
run:

```bash
make backend-install
```

Run the API with automatic reload:

```bash
make backend-dev
```

FastAPI is also the source of truth for frontend API types. After changing an
endpoint or Pydantic schema, regenerate the checked-in OpenAPI contract and
TypeScript declarations:

```bash
make api-generate
```

This writes `backend/openapi.json` and `frontend/src/api/schema.d.ts`. Do not
edit either generated file by hand.

Before committing backend changes, run the complete check suite:

```bash
make backend-check
```

Alembic reads `DATABASE_URL` through the same validated settings object as the
application. Apply migrations with `make backend-migrate`.

## Frontend development

`make setup` installs the pinned workspace dependencies. Run the React website
with:

```bash
make frontend-dev
```

Vite serves the application at `http://localhost:5173` and reloads it when
frontend files change. Run formatting, linting, unit tests, strict TypeScript
checking, and the production build together with:

```bash
make frontend-check
```

Playwright is configured separately for browser smoke tests:

```bash
make frontend-e2e
```

## Local PostgreSQL

Start the database and wait for its health check:

```bash
make db-up
```

Inspect its status:

```bash
make db-status
```

Open an interactive SQL shell:

```bash
make db-shell
```

Stop it without deleting data:

```bash
make db-down
```

`make db-reset` is destructive: it deletes the local PostgreSQL volume and
starts with an empty database. It never affects a hosted Supabase database.

## Planned local ports

| Service | Address |
| --- | --- |
| React website | `http://localhost:5173` |
| FastAPI | `http://localhost:8000` |
| FastAPI documentation | `http://localhost:8000/docs` |
| PostgreSQL | `localhost:5432` |

## Development conventions

- Work in small vertical slices and keep commits focused.
- Run formatting, linting, type checking, and tests before committing.
- Create database changes through Alembic migrations.
- Version API routes under `/api/v1`.
- Return public error messages without secrets or provider internals.
- Store all timestamps in UTC and render them in the user's local timezone.
- Keep child profiles separate from authenticated adult accounts.

## Troubleshooting

If PostgreSQL cannot bind port 5432, another database is probably using it.
Change `POSTGRES_PORT` and the port in `DATABASE_URL` together in `.env`.

If Docker reports that its daemon is unavailable, start Docker Desktop and run
`make db-up` again.

If pnpm rejects the installed Node version, install the version declared in
`.nvmrc`. Odd-numbered Node releases are not used because they do not receive
long-term support.
