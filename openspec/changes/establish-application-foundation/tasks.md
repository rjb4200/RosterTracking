## 1. Application Setup

- [ ] 1.1 Scaffold the strict TypeScript Next.js App Router application and modular-monolith source directories without modifying the untracked reference PDFs
- [ ] 1.2 Add and pin runtime and development dependencies, package scripts, lockfile, linting, formatting, Vitest, and Playwright configuration
- [ ] 1.3 Add repository ignore rules, server-only environment validation, and a documented `.env.example` with separate runtime, migration, test, and authentication settings
- [ ] 1.4 Implement a responsive public application shell and landing page that directs staff to login without exposing protected functionality

## 2. Database Foundation

- [ ] 2.1 Configure Drizzle Kit and a small reusable `pg` pool attached to Vercel Fluid Compute, with server-only runtime access and a direct migration connection
- [ ] 2.2 Define users, roles, permissions, user-role assignments, role-permission assignments, and append-only-oriented audit log tables with timestamps, foreign keys, unique constraints, and indexes
- [ ] 2.3 Generate and review the initial SQL migration and add an idempotent foundation seed for administrator/instructor roles and permission codes
- [ ] 2.4 Add transaction and repository helpers that can commit staff account changes and sanitized audit events atomically

## 3. Staff Authentication and Authorization

- [ ] 3.1 Implement username normalization, password validation, Argon2id hashing/verification, failed-login lockout, and session-version invalidation services with unit tests
- [ ] 3.2 Configure Auth.js Credentials with a 30-day encrypted cookie session, generic invalid-login responses, account-status enforcement, and successful-login auditing
- [ ] 3.3 Implement accessible login, logout, protected staff layout, and staff landing page flows
- [ ] 3.4 Implement server-side permission loading and reusable authenticated/authorized guards with allow, deny, disabled-account, and stale-session tests
- [ ] 3.5 Add idempotent administrator bootstrap and account password-reset/unlock commands that accept secrets outside source control and write sanitized audit events

## 4. Documentation and Verification

- [ ] 4.1 Document local setup, migration, seed/bootstrap, account management, test, build, and deployment procedures in the project README
- [ ] 4.2 Add architecture and roadmap documentation covering module boundaries, preferred regular student sign-in, fallback guest attendance, historical snapshots, indefinite retention, backup expectations, and official-form verification gates
- [ ] 4.3 Add database integration coverage that runs against `TEST_DATABASE_URL` when available and exits with a clear skip when it is absent
- [ ] 4.4 Add Playwright smoke coverage for the public page, login validation, protected-route redirect, successful login, and logout
- [ ] 4.5 Run OpenSpec strict validation, migration generation checks, linting, type checking, unit tests, available integration/end-to-end tests, and the production build; resolve all failures
