# My Reading Tracker frontend

This directory contains the React, TypeScript, and Vite website created in Step
3 of the project plan.

The website will communicate only with the versioned FastAPI REST API. It will
not connect directly to PostgreSQL or contain private service credentials.

## Run locally

From the repository root:

```bash
make setup
make frontend-dev
```

Open `http://localhost:5173`. The application uses `VITE_API_BASE_URL` from the
root environment configuration and defaults to the local FastAPI API.

Private routes require Supabase Auth. Add `VITE_SUPABASE_URL` and the project's
publishable key as `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env`. Parents and
teachers can register with basic household information and then use normal
email/password sign-in. Supabase persists the resulting session, and the
frontend includes its access token in FastAPI requests. Never use a Supabase
secret key in a `VITE_` variable.

For daily local work without Auth emails, see the guarded development bypass in
`docs/development.md`. It is disabled in production builds and must also be
enabled independently by the development FastAPI process.

## Frontend name

The public-facing product name is intentionally separate from internal package,
database, and service names. Set `VITE_APP_NAME` in the root `.env` file to
rename the website. The navigation brand, accessible home labels, browser title,
and metadata all derive from that value.

## Quality checks

```bash
make frontend-check
make frontend-e2e
```

The first command checks formatting and linting, runs Vitest, and produces a
strict TypeScript production build. The second runs the Playwright browser
smoke test.

## Structure

- `src/api` contains API configuration and authenticated requests.
- `src/components` contains shared UI primitives.
- `src/features/auth` contains Supabase sessions and route protection.
- `src/features/readers` contains generated-contract API hooks and persisted
  reader selection.
- `src/features/books` contains provider search, editable import/manual entry,
  and reader-library API hooks.
- `src/features/sessions` contains the fast reading-entry form and session API
  hooks used by quick logging and history corrections.
- `src/features/reports` contains date-range report queries and weekly/monthly
  range helpers used by the live dashboard.
- `src/features/rewards` contains badge progress, gift catalog, credit history,
  and redemption queries and mutations.
- `src/features/exports` contains authenticated JSON, CSV, and printable school
  PDF download behavior used by the Reports page.
- `src/layouts` contains the responsive application shell.
- `src/routes` contains route-level screens and error handling.
- `src/test` contains shared Vitest setup.
- `e2e` contains Playwright tests.
