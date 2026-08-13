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

## Books and reader libraries

The authenticated `/api/v1/books` endpoints maintain household-owned book
metadata. `/api/v1/readers/{reader_id}/books` assigns the same saved book to one
or more readers, each with an independent `planned`, `reading`, or `finished`
status. List requests can filter by `reader_id` and `status`.

Deleting a book removes it from every reader. If reading sessions reference the
book, the first delete returns `409`; the client must show the destructive
history warning before repeating with `?confirm_history=true`.

## Reading sessions

The household-scoped `/api/v1/reading-sessions` endpoints create, list, edit,
and delete reading entries. Minutes must be positive, pages cannot be negative,
and an end page cannot precede its start page. Sessions support independent,
with-adult, read-aloud, and audiobook activities.

A session requires the book to be in that reader's library. Logging the first
session moves a planned book to reading; marking a session as finished moves it
to finished and records its completion date. Multiple sessions for the same
reader and book remain distinct records. A reader-book assignment with history
cannot be removed until its sessions are deleted.

## Reports

`GET /api/v1/reports/summary` returns household-scoped totals for a required
`reader_id`, `date_from`, and `date_to`. It includes minutes, pages, distinct
finished books, reading days, current-book progress, and the five most recent
sessions. Page totals use `end_page - start_page`; sessions without both page
values contribute zero pages while still contributing their minutes.

`GET /api/v1/reports/calendar` accepts the same parameters and groups those
totals by reading date. Date ranges are inclusive, and readers outside the
authenticated household are returned as `404`.

## Data exports

`GET /api/v1/exports/reading-data` downloads a versioned JSON backup containing
the authenticated household's readers, books, reader-book statuses, and reading
sessions. Add `?format=csv` to download a spreadsheet-friendly reading-session
log with reader and book names, page totals, activities, completion flags, and
notes. Add `?format=finished-books-csv` for one row per finished reader-book,
including completion date, total reading time, pages, session count, first and
last reading dates, book length, and ISBN. The default format is JSON;
unsupported formats return `422`.

`GET /api/v1/exports/school-reading-report` accepts `reader_id`, `date_from`,
and `date_to` and returns a printable one-page PDF achievement report. It
includes the reader and household names, reporting period, minutes, reading
days, longest continuous run within the period, finished books with start and
finish dates, pages, and session totals. The selected reader must belong to the
authenticated household.

All exports use dated attachment filenames and only read existing records.
Exporting does not modify saved data, and records from other households are
never included.

## Reading rewards

The reward system is documented in `REWARD_SYSTEM_PLAN.md`. Built-in badges
cover finished books, weekly consistency, consecutive successful weeks, and
continuous reading days. Progress is recalculated after session and library-
status changes; permanent badges award idempotent credit-ledger transactions.

`GET /api/v1/rewards/progress` returns badge progress, active and longest runs,
and the available balance. Household gift CRUD uses `/api/v1/reward-items`,
while `/api/v1/reward-redemptions` handles pending, approved, rejected,
fulfilled, and cancelled requests. Rejected or cancelled requests receive an
idempotent credit refund. Complete JSON backups use schema version 2 and include
badges, gifts, transactions, and redemptions.
