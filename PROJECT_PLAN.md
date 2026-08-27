# My Reading Tracker Project Plan

## 1. Product goal

My Reading Tracker is the project's stable internal identity. It is a
private family website for recording children's reading activity, with a
separately configurable user-facing product name.
The first release should make it quick for a parent to:

1. Sign in.
2. Create a child reader profile.
3. Find or manually add a book.
4. Add the book to the child's library.
5. Record reading minutes and pages.
6. Review recent activity and progress totals.

The architecture should support a future mobile client without requiring the
backend or database to be rewritten.

## 2. Version-one scope

### Included

- Parent authentication
- A household owned by the parent
- Multiple child reader profiles
- Book search by title, author, or ISBN
- Google Books as the primary metadata source
- Open Library as a fallback source
- Editable imported metadata
- Manual book entry
- Per-reader book status: planned, reading, or finished
- Reading-session logging
- Recent reading history
- Weekly and monthly totals
- Edit and delete operations
- Basic JSON or CSV data export
- Desktop-first website with reasonable small-screen behavior

### Excluded until after version one

- Native mobile application
- Barcode camera scanning
- Offline support
- Goals, streaks, badges, or leaderboards
- Teacher and school reports
- Reviews, recommendations, or social features
- AI-generated content
- Payments or subscriptions

## 3. Technology stack

### Frontend

- React
- TypeScript
- Vite
- React Router
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- TanStack Query for server-state fetching and caching
- Vitest and React Testing Library
- Playwright for end-to-end tests

### Backend

- Python
- FastAPI
- Pydantic
- SQLAlchemy
- Alembic database migrations
- PostgreSQL driver with connection pooling
- HTTPX for Google Books and Open Library requests
- pytest

### Managed services

- Supabase-hosted PostgreSQL
- Supabase Auth
- Vercel for the static frontend
- Render or another container host for FastAPI
- Google Books API
- Open Library API

### Development tools

- Git and GitHub
- Docker for repeatable backend development and deployment
- Ruff for Python linting and formatting
- mypy or Pyright for Python type checking
- ESLint and Prettier for TypeScript
- OpenAPI-generated TypeScript API client

Exact dependency versions will be pinned when each application is scaffolded.

## 4. High-level architecture

```text
React website
    |
    | HTTPS /api/v1 + Supabase access token
    v
FastAPI backend
    |-- verifies authentication and household access
    |-- implements reading and book business rules
    |-- calls Google Books and Open Library
    |-- produces an OpenAPI contract
    v
Supabase-hosted PostgreSQL

Future React Native app ------> same FastAPI backend
```

The frontend must never receive the PostgreSQL password or Google Books API
key. All database mutations and external book searches pass through FastAPI.

## 5. Repository structure

```text
my-reading-tracker/
|-- frontend/
|   |-- src/
|   |   |-- api/
|   |   |-- components/
|   |   |-- features/
|   |   |   |-- auth/
|   |   |   |-- books/
|   |   |   |-- dashboard/
|   |   |   |-- readers/
|   |   |   `-- sessions/
|   |   |-- layouts/
|   |   |-- routes/
|   |   |-- schemas/
|   |   `-- test/
|   `-- package.json
|-- backend/
|   |-- app/
|   |   |-- api/v1/
|   |   |-- core/
|   |   |-- database/
|   |   |-- integrations/
|   |   |-- models/
|   |   |-- repositories/
|   |   |-- schemas/
|   |   `-- services/
|   |-- migrations/
|   |-- tests/
|   `-- pyproject.toml
|-- docs/
|-- .env.example
|-- docker-compose.yml
|-- Makefile
`-- README.md
```

Organize code by feature in the frontend and by responsibility in the backend.
The backend remains a modular monolith; microservices are unnecessary.

## 6. Initial database design

### households

- `id`: UUID primary key
- `name`: text
- `created_at`: timestamp with time zone
- `updated_at`: timestamp with time zone

### household_members

- `household_id`: foreign key to households
- `user_id`: Supabase Auth user UUID
- `role`: owner or reader
- `created_at`: timestamp with time zone
- Unique constraint on household and user

### readers

- `id`: UUID primary key
- `household_id`: foreign key to households
- `name`: text
- `avatar_key`: nullable text
- `created_at`: timestamp with time zone
- `updated_at`: timestamp with time zone

Children are reader profiles and do not have login accounts.

### books

- `id`: UUID primary key
- `household_id`: foreign key to households
- `title`: text
- `subtitle`: nullable text
- `authors`: text array
- `isbn_10`: nullable text
- `isbn_13`: nullable text
- `cover_url`: nullable text
- `publisher`: nullable text
- `published_date`: nullable text
- `page_count`: nullable positive integer
- `description`: nullable text
- `language`: nullable text
- `metadata_source`: manual, google_books, or open_library
- `external_source_id`: nullable text
- `created_at`: timestamp with time zone
- `updated_at`: timestamp with time zone

Book metadata is copied into My Reading Tracker rather than fetched every time it is
displayed. Imported fields remain editable.

### reader_books

- `id`: UUID primary key
- `reader_id`: foreign key to readers
- `book_id`: foreign key to books
- `status`: planned, reading, or finished
- `started_at`: nullable date
- `finished_at`: nullable date
- `created_at`: timestamp with time zone
- `updated_at`: timestamp with time zone
- Unique constraint on reader and book

### reading_sessions

- `id`: UUID primary key
- `reader_id`: foreign key to readers
- `book_id`: foreign key to books
- `session_date`: date
- `minutes`: positive integer
- `start_page`: nullable non-negative integer
- `end_page`: nullable non-negative integer
- `activity_type`: independent, with_adult, read_aloud, or audiobook
- `notes`: nullable text
- `finished_book`: boolean
- `created_at`: timestamp with time zone
- `updated_at`: timestamp with time zone

Weekly and monthly totals are derived from reading sessions. They are not
stored as duplicate counters in version one.

## 7. API outline

All endpoints are under `/api/v1`.

### System

- `GET /health`
- `GET /me`

### Readers

- `GET /readers`
- `POST /readers`
- `GET /readers/{reader_id}`
- `PATCH /readers/{reader_id}`
- `DELETE /readers/{reader_id}`

### Book discovery and library

- `GET /book-search?q=...`
- `GET /book-search/isbn/{isbn}`
- `GET /books`
- `POST /books`
- `GET /books/{book_id}`
- `PATCH /books/{book_id}`
- `DELETE /books/{book_id}`
- `POST /readers/{reader_id}/books`
- `PATCH /readers/{reader_id}/books/{book_id}`
- `DELETE /readers/{reader_id}/books/{book_id}`

### Reading sessions and reporting

- `GET /reading-sessions`
- `POST /reading-sessions`
- `GET /reading-sessions/{session_id}`
- `PATCH /reading-sessions/{session_id}`
- `DELETE /reading-sessions/{session_id}`
- `GET /reports/summary`
- `GET /reports/calendar`
- `GET /exports/reading-data`

Every household-scoped endpoint must resolve the authenticated user's
household and reject access to records outside it.

## 8. Step-by-step implementation plan

### Step 1: Establish the repository

Tasks:

1. Add the root README and development conventions.
2. Create `frontend`, `backend`, and `docs` directories.
3. Add `.gitignore`, `.editorconfig`, and `.env.example`.
4. Add root commands for setup, linting, tests, and local development.
5. Decide whether local PostgreSQL will run in Docker or use a Supabase
   development project directly. Prefer Docker locally for repeatability.

Exit criteria:

- A new developer can identify the frontend, backend, and required services.
- No secrets are committed.

### Step 2: Scaffold the backend

Tasks:

1. Create the FastAPI application and `/health` endpoint.
2. Add settings loaded from environment variables.
3. Configure structured logging and development CORS.
4. Configure SQLAlchemy sessions.
5. Configure Alembic.
6. Add Ruff, type checking, and pytest.
7. Add a Dockerfile and local development command.

Exit criteria:

- FastAPI starts locally.
- `/health` returns a successful response.
- Backend linting and tests pass.

### Step 3: Scaffold the frontend

Tasks:

1. Create the React/Vite TypeScript application.
2. Configure Tailwind CSS and shadcn/ui.
3. Configure React Router and TanStack Query.
4. Add the application shell, sidebar, header, and error boundary.
5. Add ESLint, Prettier, Vitest, and Playwright.
6. Add environment-based API configuration.

Exit criteria:

- The website starts locally.
- A placeholder dashboard renders through the application shell.
- Frontend linting and tests pass.

### Step 4: Create the database schema

Tasks:

1. Implement SQLAlchemy models for all initial tables.
2. Create the first Alembic migration.
3. Add foreign keys, unique constraints, and check constraints.
4. Add timestamps and UUID generation consistently.
5. Add repository-level integration tests using a test database.

Exit criteria:

- A new database can be built entirely from migrations.
- Invalid page counts, minutes, roles, and statuses are rejected.

### Step 5: Implement authentication and authorization

Tasks:

1. Configure Supabase Auth for email/password or magic-link login.
2. Add frontend sign-in, sign-out, and protected routes.
3. Send the Supabase access token to FastAPI as a bearer token.
4. Validate tokens in FastAPI using Supabase signing keys.
5. Create a household and owner membership for a first-time user.
6. Add reusable household-authorization dependencies.
7. Test missing, expired, and unauthorized tokens.

Exit criteria:

- An authenticated parent can enter the application.
- An unauthenticated visitor cannot access private routes or data.
- Cross-household record access is rejected.

### Step 6: Build reader profiles

Tasks:

1. Implement reader CRUD services and endpoints.
2. Add Pydantic validation for reader names.
3. Generate or update the TypeScript API client from OpenAPI.
4. Build reader list, create, edit, and delete interfaces.
5. Add a selected-reader control used by later screens.
6. Require confirmation before deleting a reader with history.

Exit criteria:

- A parent can create and maintain multiple child profiles.
- Reader data is isolated by household.

### Step 7: Build book-provider integrations

Tasks:

1. Define an internal `BookProvider` interface.
2. Implement Google Books title, author, and ISBN search.
3. Normalize external responses into one internal result schema.
4. Implement Open Library fallback search and cover lookup.
5. Add timeouts, retry limits, error handling, and result caching.
6. Prevent API keys and raw provider errors from reaching the browser.
7. Add mocked integration tests.

Exit criteria:

- A query produces normalized book choices with available covers.
- A provider failure produces a useful fallback or recoverable error.

### Step 8: Build book creation and the reader library

Tasks:

1. Implement book and reader-book services and endpoints.
2. Build the book-search results interface.
3. Build an editable confirmation form for imported metadata.
4. Build manual book entry.
5. Add books to a selected reader as planned, reading, or finished.
6. Build library filters and book-detail pages.
7. Define safe deletion behavior for books with reading sessions.

Exit criteria:

- A parent can search, select, correct, and save a book.
- Manual entry works when both external providers fail.
- The same saved book can belong to more than one reader.

### Step 9: Build reading-session logging

Tasks:

1. Implement session CRUD services and endpoints.
2. Enforce minutes and page-range rules in the backend.
3. Build a quick-log form optimized for recent books.
4. Support all four activity types.
5. Update the reader-book status when a session finishes a book.
6. Build session edit and delete flows.
7. Ensure repeated readings create distinct sessions.

Exit criteria:

- A normal reading session can be recorded in under 15 seconds.
- Incorrect entries can be edited or deleted.
- Finishing a book updates its library status consistently.

### Step 10: Build dashboard and history

Tasks:

1. Implement summary queries by reader and date range.
2. Calculate minutes, pages, books finished, and reading days.
3. Build weekly and monthly summary cards.
4. Build current-book progress displays.
5. Build recent activity and full history views.
6. Add reader, book, date, and activity-type filters.
7. Add loading, empty, and error states.

Exit criteria:

- Totals reconcile with saved sessions.
- The parent can understand recent progress from the dashboard.

### Step 11: Add export and resilience

Tasks:

1. Add a complete JSON export for backup.
2. Add a human-readable CSV session export.
3. Add provider-response caching where appropriate.
4. Add retry and timeout behavior for network operations.
5. Add user-friendly handling for paused or unavailable free services.

Exit criteria:

- The parent can download all important reading data.
- Temporary book-provider failure does not affect saved books.

### Step 12: Complete testing and security review

Status: implemented on 2026-08-14. Automated checks and the review record live
in `.github/workflows/ci.yml`, `frontend/e2e`, `backend/scripts/run_e2e.py`, and
`docs/security-review.md`.

Tasks:

1. Unit-test calculations, validation, and metadata normalization.
2. Integration-test repositories and API endpoints.
3. End-to-end test the primary parent workflow.
4. Test authorization against cross-household identifiers.
5. Review secret handling, CORS, logging, and error responses.
6. Check keyboard navigation, labels, contrast, and focus behavior.
7. Test current Chrome, Firefox, Edge, and Safari.

Required end-to-end workflow:

```text
Sign in -> create reader -> find book -> add book -> log session
        -> view dashboard -> edit session -> export data
```

Exit criteria:

- All automated checks pass in a clean environment.
- No known high-severity security or data-loss issue remains.

### Step 13: Deploy the first release

Status: repository deployment configuration and operating procedures were
implemented on 2026-08-15. Creating the production Supabase, Render, and Vercel
resources and completing production smoke tests require the account-specific
URLs and credentials.

Tasks:

1. Create separate Supabase development and production projects if feasible.
2. Deploy FastAPI to Render or the selected backend host.
3. Run production database migrations through a controlled command.
4. Deploy the frontend to Vercel.
5. Configure the frontend API URL and permitted origins.
6. Configure Supabase authentication redirect URLs.
7. Run production smoke tests.
8. Document deployment, rollback, migration, and export procedures.

Exit criteria:

- The private website works from its production URL.
- Authentication, book search, logging, reporting, and export succeed.

## 9. Version-one release criteria

Version one is complete only when a parent can:

1. Sign in securely.
2. Create at least one child reader.
3. Search for a book by title, author, or ISBN.
4. Correct imported metadata or enter a book manually.
5. Add a book to a child's library.
6. Record minutes and optional page progress.
7. Mark a book finished.
8. Review weekly and monthly activity.
9. Edit or delete an accidental entry.
10. Export the family's reading data.

## 10. Post-version-one roadmap

Potential additions should be prioritized from real usage rather than built in
advance:

1. Reading goals and noncompetitive celebrations
2. Barcode scanning
3. Printable teacher reports
4. Custom cover uploads
5. Offline-capable reading logging
6. React Native mobile client using the existing API
7. Notifications and reminders

## 11. Working method

For each implementation step:

1. Confirm its acceptance criteria.
2. Implement the smallest vertical slice.
3. Add or update automated tests.
4. Run formatting, linting, type checking, and tests.
5. Update API documentation and generated clients.
6. Commit the completed step separately.

Do not begin post-version-one features until the primary logging workflow is
deployed and used successfully.

## 12. Authentication experience redesign

The production application uses two server-assigned account roles:

- `owner`: the first parent or teacher who creates a household or classroom;
  retains full administrative access.
- `reader`: a child invited by an administrator and linked to exactly one reader
  profile; can use only that reader's library, logs, rewards, and reports.

The public account-type choice explains these paths but never grants a role.
Role assignment remains a backend responsibility: new household setup creates
the single owner, and reader access requires an invitation. A reader may not
self-select administrator access.

### Step 1: Confirm account types and permissions

Status: implemented on 2026-08-24 and revised on 2026-08-25. The existing
FastAPI authorization rules enforce one owner administrator and reader-profile
isolation. The role rules above are the contract for the remaining
authentication redesign.

### Step 2: Add public account entry choices

Status: implemented on 2026-08-24. The sign-in screen now introduces separate
**Parent or teacher** and **Reader** paths, describes their capabilities, and
informs readers that an administrator invitation is required. The existing
magic-link form remained available at this stage and was replaced by password
authentication in Step 3.

### Step 3: Add password sign-in and adult registration

Status: implemented on 2026-08-25. Parents and teachers can create an account
with their name, family or classroom name, email, and password. Email
confirmation is disabled, so a successful registration signs the user in
immediately. Existing users sign in with email and password, and Supabase
persists the browser session. Email is reserved for the forgot-password flow,
which returns through `/reset-password` to choose a new password. Registration
metadata may name the initial household, but it never assigns an application
role; FastAPI remains responsible for owner and reader membership. Reader
account creation and invitation delivery remain part of Step 4.

### Step 4: Add administrator-managed account invitations

Status: implemented on 2026-08-25 and revised on 2026-08-26. The owner can
invite a reader using only an email address. FastAPI records the invitation and
uses the Supabase Auth admin API to send a real activation email. The reader
opens its link, enters their name, and creates a password. On first access,
FastAPI creates the reader profile card, links it to the login, and assigns the
server-controlled reader role. The separate **Add reader** flow remains
available for children who share the owner’s login. A reader activation
without a matching invitation is rejected instead of creating a new owner household.
Removing pending access cancels it; removing accepted access revokes the linked
reader membership without deleting reading data. Each household has only one
adult management login: its owner. The Readers page presents invitations and
active logins in a dedicated **Manage reader access** section. Explicit
**Cancel invitation** and **Revoke access** actions replace ambiguous removable
badges, and confirmation dialogs explain their effect before access changes.

### Step 5: Harden account and session experience

Status: implemented on 2026-08-25. Expected authorization failures now have
specific user guidance: an uninvited or revoked reader is told to contact the
owner, while an expired backend session is cleared and returned to normal sign
in. The authenticated Account page displays email, role, household, and linked
reader access. Owners and readers can change their password from an active
session without sending email; email remains reserved for forgotten-password
recovery. Automated tests cover account details, password changes, invitation
errors, and expired-session handling.
