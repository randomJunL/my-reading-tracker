# My Reading Tracker backend

This directory contains the FastAPI application created in Step 2 of the
project plan.

The backend will own authentication verification, household authorization,
business rules, PostgreSQL access, and external book-provider integrations.

## Run locally

From the repository root:

```bash
make setup
make backend-dev
```

The API is available at `http://localhost:8000`, its OpenAPI documentation at
`http://localhost:8000/docs`, and its health check at
`http://localhost:8000/api/v1/health`.

## Quality checks

```bash
make backend-check
```

This runs Ruff formatting and lint checks, strict mypy type checking, and the
pytest suite. Create database migrations from the repository root with
`make backend-migration message="describe the change"`.

Database integration tests require local PostgreSQL to be running. They create
a uniquely named temporary database, apply every Alembic migration, verify that
the migration matches the SQLAlchemy metadata, and remove the database when the
test session finishes.

## Authentication

Private endpoints validate Supabase access tokens against the project's
asymmetric signing keys. Configure `SUPABASE_URL`; the issuer and JWKS URL are
derived automatically. `SUPABASE_JWT_ISSUER` and `SUPABASE_JWKS_URL` are
available as explicit overrides.

`GET /api/v1/me` is the authenticated account bootstrap endpoint. On a user's
first request it creates a household and owner membership. Subsequent requests
return the same household. The backend never accepts a publishable key or JWT
secret as proof of user identity.

Local development can use the explicitly gated identity bypass documented in
`docs/development.md`. The settings validator prevents this bypass from being
enabled in test or production environments.

## Reader profiles

The authenticated `/api/v1/readers` endpoints create, list, update, and delete
profiles only within the current user's household. Requests for another
household's identifiers return `404` rather than revealing that the profile
exists.

Deleting a profile that has library entries or reading sessions first returns
`409`. After displaying a destructive confirmation, the client may repeat the
request with `?confirm_history=true`; related reader history is then deleted by
the database's cascades.

Run `make api-generate` after changing the API contract so the frontend's
checked-in OpenAPI types stay synchronized.

## Book search providers

Authenticated clients can search with `GET /api/v1/book-search?q=...`, combine
the `title` and `author` parameters, or use
`GET /api/v1/book-search/isbn/{isbn}`. Results from Google Books and Open
Library share one normalized schema that can be saved as a book in Step 8.

Google Books is used first when `GOOGLE_BOOKS_API_KEY` is configured. Open
Library is tried when Google is unavailable or returns no useful results. Both
providers have bounded timeouts and retries; successful and empty responses are
cached briefly. If neither provider responds, the API returns a generic `503`
that directs the parent to retry or use manual entry without exposing provider
details.
