# Production deployment and operations

The first-release production layout is:

```text
Vercel (React) -> Render (FastAPI) -> Supabase PostgreSQL
                       |
                       +-> Supabase Auth
                       +-> Google Books / Open Library
```

Keep development and production in separate Supabase projects. Never reuse the
production database URL or production users in local `.env` files.

## 1. Create the production Supabase project

Create a new Supabase project for production and record these values without
committing them:

- Project URL, used by `SUPABASE_URL` and `VITE_SUPABASE_URL`
- Publishable key, used only by `VITE_SUPABASE_PUBLISHABLE_KEY`
- PostgreSQL session-pooler connection string, used by `DATABASE_URL`

Use the session pooler when the backend host requires IPv4. Convert the
connection string to SQLAlchemy's psycopg driver form:

```text
postgresql+psycopg://USER:PASSWORD@HOST:5432/postgres?sslmode=require
```

The application never needs a Supabase secret key or JWT secret. FastAPI
validates access tokens with the project's public JWKS endpoint.

The `20260815_09` migration enables row-level security without adding direct
client policies. This deliberately blocks the Supabase Data API's `anon` and
`authenticated` roles from application tables; all application data access
continues through household-authorized FastAPI endpoints. Confirm this state in
Supabase's Security Advisor after the migration.

## 2. Deploy FastAPI on Render

Connect the repository as a Render Blueprint. Render reads `render.yaml`, builds
`backend/Dockerfile`, and creates one Free web-service instance. Because Render's
dedicated pre-deploy command is a paid feature, the container applies migrations
before starting FastAPI. Render then checks `/api/v1/health` and deploys only
after repository checks pass.

The Free instance is intended for evaluation and light family testing. It spins
down after an idle period and can take time to answer the first request after it
wakes. Upgrade the same service to Starter before relying on it for regular
school use.

Provide these prompted values in the Render dashboard:

| Variable                     | Production value                                                  |
| ---------------------------- | ----------------------------------------------------------------- |
| `DATABASE_URL`               | Supabase session-pooler URL with `sslmode=require`                |
| `CORS_ORIGINS`               | Exact Vercel production origin, such as `https://reading.example` |
| `SUPABASE_URL`               | Production Supabase project URL                                   |
| `GOOGLE_BOOKS_API_KEY`       | Restricted production key, or blank to use Open Library           |
| `OPEN_LIBRARY_CONTACT_EMAIL` | Maintained school or administrator contact                        |

`APP_ENV=production` activates fail-fast validation. Deployment stops if auth
is missing, the database points to localhost, or CORS contains HTTP, localhost,
paths, or wildcards. Render supplies `PORT`; the container listens on that port.

After the first backend deployment, record the HTTPS API origin, for example:

```text
https://my-reading-tracker-api.onrender.com
```

## 3. Deploy React on Vercel

Import the same repository into Vercel and set **Root Directory** to `frontend`.
The checked-in `frontend/vercel.json` builds Vite, serves `dist`, restores React
Router routes through the SPA fallback, and adds baseline browser security
headers.

Configure these Vercel production variables before deploying:

| Variable                        | Production value                    |
| ------------------------------- | ----------------------------------- |
| `VITE_APP_NAME`                 | School or program display name      |
| `VITE_API_BASE_URL`             | `https://BACKEND_HOST/api/v1`       |
| `VITE_DEV_AUTH_BYPASS`          | `false`                             |
| `VITE_SUPABASE_URL`             | Production Supabase project URL     |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Production Supabase publishable key |

Vite embeds all `VITE_` values into the browser build. Never place database
credentials, secret keys, SMTP passwords, or unrestricted provider keys in a
`VITE_` variable.

Once the Vercel production URL is known, update `CORS_ORIGINS` in Render to that
exact origin and redeploy FastAPI.

## 4. Configure Supabase Auth URLs

In the production project, open **Authentication -> URL Configuration**:

1. Set **Site URL** to the exact Vercel production origin.
2. Add the same production origin to **Redirect URLs**.
3. Keep localhost redirects only in the separate development project.
4. Add preview URL wildcards only if preview deployments must use production
   authentication; a separate preview Supabase project is safer.

The frontend supplies `window.location.origin` as the registration confirmation
redirect, so each deployed origin must be present in Supabase's allow list.

For real school use, configure custom SMTP. Supabase's default mail service is
intended for testing and its low email quota is not suitable for normal users.

## 5. Migration procedure

Every Render container start runs:

```bash
python -m scripts.production_migrate
```

The command requires `APP_ENV=production`, upgrades to the Alembic head, and
then verifies that the deployed models have no ungenerated schema operations.
The Docker image runs it before starting Uvicorn, so a failed migration
prevents the API health check from succeeding. Keeping startup in the image
also avoids platform-specific command-string quoting. Alembic upgrades are
idempotent; waking or restarting an already-migrated service simply confirms
that the database is current.

When upgrading the web service to a paid instance, change `plan: free` to
`plan: starter` and restore this Blueprint field:

```yaml
preDeployCommand: python -m scripts.production_migrate
```

That moves migration execution back to Render's dedicated pre-deploy phase.

Before merging a migration:

1. Back up the production database or confirm point-in-time recovery coverage.
2. Run the migration and full E2E suite against a disposable database.
3. Review whether the change is backward-compatible with the currently running
   application.
4. Prefer expand-and-contract migrations for destructive or large changes.

Never run `alembic downgrade` in production merely to roll back application
code. A downgrade can destroy data. Restore a verified backup or deploy a
reviewed forward-fix migration when schema recovery is required.

## 6. Release and smoke-test procedure

Run the unauthenticated availability checks after both hosts deploy:

```bash
.venv/bin/python backend/scripts/smoke_test.py \
  --api-url https://BACKEND_HOST \
  --frontend-url https://FRONTEND_HOST
```

Then use a dedicated production smoke-test household and complete this manual
workflow in current Chrome, Edge, Firefox, and Safari:

```text
Password sign in -> create reader -> find and add book -> log session
-> dashboard -> edit session -> download CSV and PDF -> sign out
```

Also verify that a reader-role account cannot open admin pages, book-provider
failure shows a safe message, and another household's identifiers remain
inaccessible. Delete the smoke-test records from the interface when finished.

## 7. Export and backup procedure

- An administrator should download the household reading-history and
  finished-books spreadsheets regularly and before risky changes.
- Database backups are configured and restored through Supabase; application
  CSV/PDF exports are useful records but are not a full relational backup.
- Test restoration into a non-production project before relying on a backup.
- Treat exports as student records: store them only in an approved location and
  delete obsolete local copies.

## 8. Rollback procedure

For an application-only regression:

1. Stop automatic deployments.
2. Redeploy the last known-good Render commit and Vercel deployment.
3. Confirm `/api/v1/health`, sign-in, logging, and exports.
4. Re-enable deployments only after the corrective change passes CI.

If the release included a migration, first determine whether the older code is
compatible with the new schema. Do not redeploy incompatible code. Use a
forward-fix or restore a pre-migration backup according to the reviewed recovery
plan, then repeat the production smoke test.

## 9. First-release sign-off

Record the following outside the repository:

- Production frontend and backend URLs
- Supabase project reference and backup/PITR setting
- Release commit and migration revision
- Smoke-test date, browsers, tester, and result
- Rollback owner and incident contact
- Where school-approved exports and recovery instructions are stored
