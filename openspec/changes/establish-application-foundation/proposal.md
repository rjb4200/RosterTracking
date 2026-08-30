## Why

The repository contains planning tooling but no runnable application, database migration workflow, or staff access control. Establishing a small production-oriented foundation first gives later roster features a tested, secure base without attempting the full application in one change.

## What Changes

- Create a Next.js App Router application using strict TypeScript and a modular-monolith directory structure.
- Configure Drizzle ORM for Neon PostgreSQL with reviewed SQL migrations and separate runtime and migration connection settings.
- Add environment validation and a safe `.env.example` that never exposes database credentials to browser code.
- Add simple staff username/password authentication using Auth.js Credentials, Argon2id password hashes, persistent secure sessions, logout, and server-side active-account checks.
- Add data-driven staff roles and permissions in Neon rather than hard-coded role checks.
- Add an administrator bootstrap command and protected staff landing page.
- Add unit/integration test foundations, critical authentication tests, linting, type checking, and build verification.
- Document the approved modular architecture and phased roadmap for students, guest sign-in, classes, attendance, finalization, reporting, retention, and official PDF generation.
- Defer student sign-in, class management, attendance, guest attendance, roster generation, and production infrastructure provisioning to later changes.

## Capabilities

### New Capabilities

- `application-foundation`: Runnable Next.js/TypeScript application, validated server environment, Neon/Drizzle database access, migrations, quality checks, and modular-monolith boundaries.
- `staff-authentication`: Internal username/password login, persistent staff sessions, logout, account status enforcement, and database-backed roles and permissions.

### Modified Capabilities

None.

## Impact

- Adds the initial application source tree, package manifest and lockfile, framework/tooling configuration, database schema and migrations, tests, and project documentation.
- Introduces Next.js, React, Drizzle ORM/Kit, Auth.js, `pg`, Argon2, Zod, Vitest, and Playwright dependencies.
- Requires `DATABASE_URL`, `DATABASE_URL_DIRECT`, and `AUTH_SECRET` in deployed environments.
- Establishes Neon PostgreSQL as the system of record and Vercel Node.js/Fluid Compute as the intended runtime.
- Does not modify or commit the currently untracked Kentucky Fire Commission or KBEMS reference PDFs.
