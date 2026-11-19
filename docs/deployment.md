# Deployment

This is the release runbook for RosterTracking. The deployment is not complete when
Vercel reports success. It is complete only when the expected commit is live, the
target database ledger is in sync, and the environment-specific checks pass.

The operator workflows are:

- `/deploy-dev` — release a reviewed change to the `dev` branch preview.
- `/deploy-prod` — promote a verified `dev` release to production.

They are instructions for the release operator, not a replacement for branch
protection or CI enforcement.

## Environment map

```text
local work ──> .env ──> local development database

feature PR ──> dev ──> Vercel Preview ──> rosterdev.winchesterfireems.com
                              │
                              └──> deployed dev database (separate)

dev PR ──> main ──> Vercel Production ──> rosters.winchesterfireems.com
                              │
                              └──> production database: roster_production
```

| Environment | Git ref | Vercel target | Public origin | Database |
| --- | --- | --- | --- | --- |
| Local development | local | none | none | local `.env` database |
| Dev deployment | `dev` | Preview branch deployment | `rosterdev.winchesterfireems.com` | deployed dev database via `DEV_DATABASE_URL_DIRECT` |
| Production | `main` | Production | `rosters.winchesterfireems.com` | `roster_production` |
| Integration tests | local/CI | none | none | `TEST_DATABASE_URL` |
| Browser tests | local/CI | none | none | `E2E_DATABASE_URL` |

The local `.env` database and the deployed dev database are intentionally
separate. Local development must never be used as the target for a `dev`
deployment migration. The production database lives in the separate Neon project
`RosterGenerator-Production`. A connection string that cannot be identified as
the intended environment is a blocker.

## Dev sequencing rule

The deployed dev database is separate from local `.env`. Apply dev deployment
migrations **before** merging the feature PR into `dev`:

```text
deployed dev db:status
        ↓
apply pending migrations with DEV_DATABASE_URL_DIRECT
        ↓
deployed dev db:status == In sync.
        ↓
merge feature PR -> dev
        ↓
Vercel dev deployment
        ↓
verify rosterdev and the deployed dev ledger
```

During the rollout, Vercel Preview must set `ADDITIONAL_INSTRUCTOR_EDITING=1`.
Without that flag the class wizard and instructor form intentionally hide the
additional-instructor controls.

## Production sequencing rule

`main` deploys production automatically. Therefore production migrations must be
applied **before** the `dev -> main` merge:

```text
verified dev release
        ↓
production snapshot
        ↓
production migration
        ↓
production db:status == In sync.
        ↓
production-migration-gate == success
        ↓
merge dev -> main
        ↓
Vercel production deployment
        ↓
production db:status == In sync.
        ↓
post-deploy verification
```

The migration gate is a required GitHub check. A PR into `main` cannot merge while
production has a pending, skipped, edited, or uncommitted-applied migration.

## Production migration gate

Workflow: `.github/workflows/production-migration-gate.yml`.

It runs on every PR into `main` and executes:

```text
npm run db:status -- --allow-production
```

It requires a read-only production connection string in the repository secret
`PRODUCTION_DATABASE_READONLY_URL`.

The job fails closed when:

- the secret is missing;
- the database is unreachable;
- the ledger has any pending migration;
- the ledger has a skipped migration;
- a committed migration was edited after it was applied;
- the ledger contains a migration that is not committed.

The job must be added to `main` branch protection as a required status check.
Without that setting the workflow is advisory only.

Do not use `pull_request_target` to expose the secret to fork pull requests. Fork
PRs do not receive repository secrets and therefore fail the gate. That is the
intended fail-closed behavior.

## Read-only production role

Do not give the gate the production owner credential. Create a dedicated Neon role
for the ledger check:

```sql
create role roster_ledger_readonly login password '<generated-password>';
grant connect on database roster_production to roster_ledger_readonly;
grant usage on schema drizzle to roster_ledger_readonly;
grant select on drizzle.__drizzle_migrations to roster_ledger_readonly;
```

Use its direct (non-pooler) connection string as `PRODUCTION_DATABASE_READONLY_URL`.
The role only needs to read the migration ledger.

## Deployed dev migration credential

The `dev` deployment uses a separate database from local `.env`. The operator
command requires `DEV_DATABASE_URL_DIRECT`, pointing at the Neon branch behind the
Vercel `dev` deployment (`preview/dev`). Never use the local `.env`
`DATABASE_URL_DIRECT` for a dev deployment migration.

For the duration of the dev status or migration command:

```text
DATABASE_URL_DIRECT = DEV_DATABASE_URL_DIRECT
PROTECTED_DATABASE_NAMES = roster_production
```

Verify the target and apply migrations before merging the feature PR into `dev`.
Then require the deployed dev ledger to report `In sync.`.

## Production migration credential

The operator command requires a separately supplied
`PRODUCTION_DATABASE_URL_DIRECT`. It must not come from the local `.env` file.

For the duration of the status or migration command, set the name the scripts
expect from the operator-only value:

```text
DATABASE_URL_DIRECT = PRODUCTION_DATABASE_URL_DIRECT
PROTECTED_DATABASE_NAMES = roster_production
```

Never print the connection string. Verify and report only the host and database
name, redacted.

## Snapshots

Before any production schema write:

1. Take a Neon snapshot of the production branch.
2. Record the snapshot name or ID and creation time.
3. Never use `finalize: true` or restore over production as part of a routine
   release.
4. A restore drill must use `finalize: false` on a separate branch.

If a snapshot cannot be taken and verified, production migration must stop.

## Merge rules

- Feature changes enter `dev` through a reviewed PR.
- `dev` enters `main` through a reviewed PR.
- Use **Create a merge commit**. Do not squash or rebase release PRs.
- Never push directly to `main`.
- The production migration gate must be green before the merge.
- The Vercel production deployment SHA must equal the resulting `origin/main`
  merge commit.

## Verification

A release is `PASS` only when:

- the expected SHA is live on the expected origin;
- the target database is the expected database, verified separately from the
  application URL;
- the migration ledger reports `In sync.` after deployment;
- authenticated staff access and `GET /api/staff/key-health` work;
- the applicable public, class lifecycle, PDF, email, and data flows pass;
- Vercel runtime errors and logs show no unexpected failures;
- any linked issues closed were verified in the target environment.

For browser-critical or auth/PDF/email/class-lifecycle releases, run
`CI=1 npm run verify:full`. It runs the browser suite serially for a stable
cross-browser result.

Otherwise the release is `BLOCKED` or `PARTIAL`. Never claim success from a push,
a green build, or a READY Vercel deployment alone.

## Rollback

- **Bad code, compatible schema:** roll back the Vercel production deployment.
- **Bad migration or data:** stop, capture impact, and use a separately approved
  Neon restore procedure.
- **Never** automatically reverse a forward-only migration in the release command.
- A code rollback is safe only while the deployed schema remains compatible.

## Access checklist

- Vercel MCP authenticated for project inspection, deployment verification, logs,
  and rollback.
- `gh` optionally authenticated for PR merge and issue updates. The release
  commands do not depend on GitHub MCP.
- `DEV_DATABASE_URL_DIRECT` available to the operator during a `dev` release.
- `PRODUCTION_DATABASE_READONLY_URL` configured for the gate.
- `PRODUCTION_DATABASE_URL_DIRECT` available to the operator only during an
  approved production migration.
- `production-migration-gate` required in `main` branch protection.
- Neon snapshot capability available before a production migration.
