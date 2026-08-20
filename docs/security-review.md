# Step 12 security and quality review

Review date: 2026-08-14

## Scope and release gate

This review covers authentication, household and reader authorization, secrets,
CORS, logging, API errors, database migration safety, the primary browser
workflow, accessibility basics, and browser compatibility. Step 12 is ready
only when the repository checks and the disposable-database browser suite pass.

No known high-severity security or data-loss issue was found during this
review. The deployment items listed below remain Step 13 release checks.

## Automated coverage

- Backend unit and integration tests cover validation, calculations, provider
  normalization, API behavior, role restrictions, invalid tokens, and hidden
  cross-household records.
- Frontend tests cover the main route behavior and user interactions.
- Playwright first verifies that a signed-out visitor is redirected to sign in.
- The authenticated Playwright workflow creates a reader, searches for and
  adds a book, logs a session, checks the dashboard, edits the session, and
  downloads the reading-history CSV.
- Browser tests create and migrate a uniquely named PostgreSQL database, then
  drop it even when a test fails. They do not write to the normal development
  database.
- CI repeats formatting, linting, type checking, tests, production builds,
  migration checks, generated API-contract checks, and Playwright runs on
  Chromium, Firefox, and WebKit.

## Security findings

### Authentication and authorization

- FastAPI validates Supabase access-token signature, issuer, audience, expiry,
  and required claims. Missing and invalid bearer tokens are rejected.
- The local authentication bypass requires `APP_ENV=development`; application
  startup rejects it in test and production.
- Household resources are resolved through shared authorization dependencies.
  Tests confirm that identifiers from another household return a hidden `404`
  instead of exposing whether the record exists.
- Reader accounts are restricted to their linked profile, while owner and
  caregiver accounts retain administration access. Role tests cover protected
  reader, recommendation, gift, redemption, report, and export operations.

### Secrets and browser configuration

- Supabase's public URL and publishable key are the only authentication values
  intended for `VITE_` variables. Database credentials and provider keys remain
  backend-only.
- Book-provider requests originate in FastAPI. HTTP client logging is kept at
  warning level because provider credentials may appear in upstream query
  strings.
- `.env` is ignored and `.env.example` contains placeholders rather than live
  secrets. Production secret values must be supplied by the deployment host.

### CORS, logging, and errors

- CORS uses an explicit environment-controlled origin list. Production must
  contain only the deployed frontend origin; wildcard origins are not allowed
  with authenticated requests.
- Request logs include request ID, method, path, status, and duration. They do
  not include authorization headers, request bodies, email addresses, query
  strings, or response bodies.
- Provider failures are converted to user-safe API responses; raw upstream
  URLs, credentials, and exception details are not returned to the browser.

### Data integrity and recovery

- Database structure is reproducible from Alembic migrations, and the E2E
  runner checks that models and the migration head have no pending schema diff.
- Gift removal is a soft delete, preserving redemption history and ledger
  references. Existing exports provide a user-controlled copy of reading data.
- Before a production migration, Step 13 must take a database backup and define
  a tested rollback or forward-fix procedure.

## Accessibility review

The application uses native landmarks, headings, buttons, links, labels, and
select controls. Icon-only controls and generated book/session actions have
accessible names. Shared buttons and interactive calendar controls include a
visible keyboard focus ring, and dialogs are labelled by their headings.

Before the first production release, perform the following manual check with
real content on both desktop and a narrow viewport:

1. Complete sign-in, navigation, session logging, editing, and export using
   only Tab, Shift+Tab, Enter, Space, Escape, and arrow keys where appropriate.
2. Confirm focus is always visible and returns to the triggering control after
   closing each dialog.
3. Check every input's announced name, validation message, and error recovery
   with VoiceOver or NVDA.
4. Run an automated contrast audit against normal, hover, focus, disabled, and
   error states; manually verify text embedded in badge artwork.
5. Confirm browser zoom at 200% does not hide actions or require two-dimensional
   scrolling on primary pages.

## Browser matrix

CI exercises Playwright's current Chromium, Firefox, and WebKit engines. Before
production deployment, also run one manual smoke test in the current stable
releases of Google Chrome, Microsoft Edge, Mozilla Firefox, and Apple Safari.
Real Edge and Safari smoke tests remain necessary because their operating-system
integration is not identical to Playwright's browser engines on Linux.

## Step 13 deployment checks

- Configure exact production CORS and Supabase redirect origins.
- Keep the development authentication bypass disabled.
- Vercel configuration now supplies HTTPS-only transport, framing, MIME,
  referrer, permissions, and Content Security Policy headers. Confirm them on
  the deployed response and configure request-size limits and rate limiting
  where appropriate.
- Verify production logs and error monitoring do not collect tokens or personal
  reading notes.
- Back up the production database before migrations and run the release smoke
  test and export check after deployment.
