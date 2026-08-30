# Roster Command

Fire and EMS training attendance and roster management for one department. The project is a Next.js modular monolith backed by Neon PostgreSQL.

The current implementation provides the application foundation and internal staff authentication. Student sign-in, classes, attendance, finalization, external reporting, and official roster PDFs are implemented in later OpenSpec changes.

## Requirements

- Node.js 24 or later
- npm 11 or later
- A Neon PostgreSQL database for development
- A separate PostgreSQL database for integration and end-to-end tests when those tests are enabled

## Local Setup

1. Install dependencies with `npm install`.
2. Create `.env.local` from `.env.example` and replace every placeholder.
3. Generate `AUTH_SECRET` with `npx auth secret` or another cryptographically secure generator.
4. Apply migrations with `npm run db:migrate`.
5. Seed foundation roles and permissions with `npm run db:seed`.
6. Bootstrap the first administrator as described below.
7. Start the application with `npm run dev`.

Database credentials are server-only. Never prefix them with `NEXT_PUBLIC_` or expose them to browser code.

## Database Workflow

Schema definitions live under `src/server/db/schema`. Generated SQL migrations live under `drizzle` and are committed for review.

```text
npm run db:generate
npm run db:migrate
npm run db:seed
```

Use `DATABASE_URL` for application runtime traffic and `DATABASE_URL_DIRECT` for migrations and administrative commands. Migrations must run once as a deployment step and never during application startup.

## Staff Accounts

Staff accounts use normalized usernames and Argon2id password hashes. Auth.js stores the login in an encrypted, secure, HTTP-only cookie for up to one year. Protected operations reload account state and permissions from Neon, so disabling an account or resetting its password invalidates existing sessions.

Administrative commands read credentials from environment variables so passwords do not appear in command history.

### Bootstrap Administrator

Set `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and optionally `ADMIN_DISPLAY_NAME`, then run:

```text
npm run admin -- bootstrap
```

Run `npm run db:seed` first. Bootstrap is idempotent and grants the administrator role.

### Account Operations

Set `ADMIN_USERNAME`; password reset also requires `ADMIN_PASSWORD`.

```text
npm run admin -- reset-password
npm run admin -- unlock
npm run admin -- disable
npm run admin -- enable
```

These operations are audited. Passwords and password hashes are excluded from audit details.

## Verification

```text
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run test:e2e
npm run build
openspec validate establish-application-foundation --strict
```

Unit tests do not require production credentials. Database integration tests skip clearly when `TEST_DATABASE_URL` is absent. The authenticated Playwright scenario also requires `E2E_STAFF_USERNAME` and `E2E_STAFF_PASSWORD` for a staff account bootstrapped in that test database.

Install the Playwright Chromium browser once with `npx playwright install chromium`.

## Deployment

- Deploy the application to Vercel using the Node.js runtime and Fluid Compute.
- Place Neon and Vercel compute in the same region.
- Configure `DATABASE_URL`, `DATABASE_URL_DIRECT`, `AUTH_SECRET`, and `NEXTAUTH_URL` as protected environment variables.
- Apply reviewed migrations through CI or an explicit release step before deploying schema-dependent code.
- Keep the runtime pool small and monitor aggregate Neon connections.
- Do not run migrations automatically from a Vercel Function.

Production launch also requires Neon point-in-time recovery, scheduled snapshots, separate logical exports, backup alerts, and a tested restoration procedure. See `ARCHITECTURE.md` and `ROADMAP.md` for durable design decisions and phased work.
