## Context

The repository currently contains OpenSpec workflow files and untracked official-reference PDFs but no application. See `proposal.md` for motivation and the capability specs for behavioral requirements. The application targets one department, values durable records over multi-tenant flexibility, and must remain a modular monolith. Staff use simple persistent username/password login; students will use separate regular and guest attendance flows in later changes.

## Goals / Non-Goals

**Goals:**

- Establish one deployable Next.js application with strict server/client boundaries.
- Establish a reviewed Drizzle migration workflow and transaction-capable Neon access.
- Keep staff authentication simple while using accepted password and cookie security practices.
- Make server-side permissions extensible without introducing tenant scoping.
- Provide enough automated verification that later vertical slices can build safely.
- Preserve the approved long-term domain model and implementation roadmap in repository documentation.

**Non-Goals:**

- Student records, regular or guest student sign-in, remembered devices, classes, QR codes, attendance, finalization, reporting queues, PDF generation, or object storage.
- MFA, OAuth, magic links, email verification, public staff registration, or staff/student identity linkage.
- Multi-tenancy, microservices, asynchronous job infrastructure, or production cloud provisioning.
- Committing or interpreting the untracked official PDF files as current legal requirements.

## Decisions

### Next.js modular monolith

Use the current stable Next.js App Router with strict TypeScript. Route files remain thin adapters; server behavior lives under `src/modules`, shared infrastructure under `src/server`, and reusable UI under `src/components`. This keeps one deployment while preventing later attendance and reporting logic from accumulating in route handlers.

Alternatives considered: a separate API service would add deployment and authorization complexity without a current scaling need; a flat application structure would be quicker initially but make later domain boundaries harder to enforce.

### Neon access through Drizzle and node-postgres

Use Drizzle ORM with `pg` in the Node.js runtime. A small process-level pool is attached to Vercel Fluid Compute with `attachDatabasePool()` so idle connections are released before suspension. Runtime code uses `DATABASE_URL`; migrations use `DATABASE_URL_DIRECT`. Schema changes are generated as SQL, committed, reviewed, and run explicitly rather than at application startup.

Alternatives considered: Neon HTTP is efficient for one-shot queries but does not provide the interactive transaction model needed by later attendance/finalization operations. Prisma provides strong tooling but adds a larger abstraction and generated client where explicit SQL is preferred.

### Auth.js Credentials with encrypted cookie sessions

Use Auth.js Credentials for username/password verification and an encrypted HTTP-only cookie session with a one-year maximum age. Usernames are trimmed and normalized to lowercase. Passwords are hashed with Argon2id. The session carries only the user identifier and password/session version; protected server entry points reload the user and permissions from Neon, which makes account disabling and permission changes effective without waiting for cookie expiry.

Password reset increments a `session_version`, invalidating sessions issued under older credentials. Failed-login counters and a bounded `locked_until` timestamp provide simple account throttling without introducing another service. Public registration and email-based recovery are absent; an administrator uses an explicit account-management command.

Alternatives considered: Clerk was rejected by the user. A bespoke cookie/session framework would create unnecessary security-sensitive code. Database session rows offer precise per-device revocation but add lifecycle management that is not required for this small staff population.

### Data-driven global authorization

Use `users`, `roles`, `permissions`, `user_roles`, and `role_permissions`. Domain services request permission codes such as `staff.access` or `staff.manage`; they do not compare role names. Assignments are global because this is one department. Initial seeds create administrator and instructor roles plus foundation permissions.

Alternatives considered: role-name checks are simpler but make additional permission levels costly. Tenant- or agency-scoped grants are intentionally deferred because the department does not need tenant isolation.

### Initial database schema

The first migration creates staff identity and authorization tables plus an append-only-oriented `audit_logs` table. User rows include normalized username, password hash, active state, failed login count, lock expiry, session version, and timestamps. Unique and foreign-key constraints protect identities and role assignments. Application writes that change account state also insert audit records in the same transaction.

Later domain migrations will add students and training records. Instructor roster identity remains separate from student identity; a future `instructor_profiles` table will hold official instructor fields without a user/student foreign-key association.

### Environment and test strategy

Validate server environment through a server-only Zod module. Unit tests cover normalization, password verification behavior, and authorization decisions without a live database. Integration tests run migrations and repository behavior against a test PostgreSQL database when `TEST_DATABASE_URL` is provided. Playwright is configured now, with critical workflow tests added as user-facing flows appear.

Build validation uses safe placeholder server values only where Next.js statically evaluates server modules; runtime database operations still fail closed if real configuration is unavailable.

### Retention and roadmap documentation

Add an architecture document recording indefinite business-record retention, immutable finalization revisions, preferred regular student sign-in, fallback guest attendance, private PDF storage, backup expectations, and official-source verification gates. This is documentation only in this change; durable backup automation is implemented when production infrastructure is provisioned.

## Risks / Trade-offs

- [One-year cookie sessions cannot be individually revoked] -> Reload account status, session version, and permissions on protected server operations; logout removes the current cookie.
- [Database checks add latency to protected requests] -> Keep authorization queries indexed and local to the same Neon/Vercel region; optimize only after measurement.
- [Direct PostgreSQL pools can consume connections across warm instances] -> Use a deliberately small pool, attach it to Fluid Compute, monitor aggregate connections, and retain the option to use Neon's pooled endpoint.
- [Native Argon2 packages can complicate deployment] -> Use a maintained package with supported Node/Vercel prebuilt binaries and verify the production build in CI.
- [Account lock counters do not throttle unknown usernames by IP] -> Return generic errors and keep this simple for the small internal user base; add edge or durable IP rate limiting only if monitoring shows abuse.
- [Foundation integration tests need PostgreSQL] -> Make database integration tests explicit and skip them with a clear message when no test URL is configured; CI must provide one before production launch.
- [Indefinite retention increases storage and privacy exposure] -> Apply least privilege, backups, private storage, and a future approved retention policy without silently deleting business records.

## Migration Plan

1. Install pinned dependencies and commit the lockfile.
2. Add configuration, application shell, database schema, and generated migration.
3. Apply the migration to an isolated development or Neon branch database.
4. Run the administrator bootstrap command with operator-supplied credentials.
5. Verify login, persistence, logout, account disabling, and permission denial.
6. Run lint, type checking, unit tests, applicable integration tests, and production build.
7. Deploy only after `DATABASE_URL`, `DATABASE_URL_DIRECT`, and `AUTH_SECRET` are configured in the target environment.

Rollback before production data exists by reverting the deployment and dropping the isolated branch. After staff accounts exist, roll back application code only to a schema-compatible version; do not automatically reverse or drop production tables.
