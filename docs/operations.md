# Operations

## Backup and recovery

### What is configured

Neon takes an automatic snapshot of the production branch **daily at 06:00 UTC**
and retains it for **30 days**. Manual snapshots are taken before risky
operations and are retained until deleted. Current manual snapshots include
`before-e2e-wipe-2026-09-20`, `pre-clean-class-data`, and
`pre-host-agency-migration`.

### Restoring

1. Pick the snapshot to restore from (`list_snapshots`).
2. Restore it onto a **new branch**, never over production:
   `restore_snapshot` with an explicit `name`.
   **Pass `finalize: false`.** Finalization reassigns the production compute and
   swaps branch names, replacing production with the restored branch — see the
   drill record below for what that does.
3. Verify the restored branch before trusting it: compare table count, migration
   count, and row counts for `users`, `classes`, `attendance`,
   `finalization_revisions`, and `audit_logs` against production.
4. Only then decide whether to promote it.
5. Delete the scratch branch when finished.

### Restore drill — 2026-09-21

Restored `snapshot_2026-09-21T06:00:20Z` (snapshot `snap-shiny-bar-aehg6zae`).
The restored database matched production on every measure:

| Measure | Production | Restored |
| --- | --- | --- |
| users | 10 | 10 |
| classes | 25 | 25 |
| attendance | 23 | 23 |
| finalization_revisions | 22 | 22 |
| students | 2 | 2 |
| audit_logs | 287 | 287 |
| public tables | 34 | 34 |
| applied migrations | 8 | 8 |

**The restore mechanism works, and recovery from a snapshot is proven.**

**However, the drill was not non-destructive.** `restore_snapshot` defaulted to
`finalize: true`, which reassigned the production compute and swapped branch
names. The restored branch became the project default, named `production`, and
took over the endpoint in `DATABASE_URL`; the original production branch was
renamed `restore-drill-2026-09-21 (1)` and given a new endpoint. No data was
lost — the counts above were identical on both branches, so nothing had been
written between the 06:00 snapshot and the swap — but the project's branch
layout is now swapped and the original branch is misnamed.

**Lesson: always pass `finalize: false` when restoring for a drill.** That is
what keeps a drill read-only in effect.

## Migration ledger — resolved 2026-09-21

Production previously recorded **8 applied migrations** against **14** in the
repository. Five had been applied out of band, and `0013` was genuinely
unapplied. All five were verified present (attendance tables, credit columns,
the `credited_hours` constraint, the finalization tables, the class public-code
and PIN columns), their ledger records were backfilled with the correct hashes,
and `0013` was applied through the migrator. The ledger now holds all 14 rows,
and `classes_status` no longer permits `draft`.

**How the migrator actually decides.** It selects the row with the greatest
`created_at` and applies only migrations whose `when` is strictly greater
(`node_modules/drizzle-orm/pg-core/dialect.js`). Unrecorded migrations *older*
than the maximum are therefore skipped, not re-run — so the original concern
that `0005` would fail on an existing `attendance` table was wrong. The
practical risk was confined to `0013`, which sorts after `0012`.

Reconciling the ledger was still worth doing: a ledger that disagrees with
reality is exactly what makes this question hard to answer.

**Remaining inconsistency.** The `classes.status` column still carries
`DEFAULT 'draft'`, which the narrowed check constraint no longer permits. No
code omits `status` on insert — `createOpenClass` sets `open` explicitly — so it
is inert today, but an insert that omitted it would fail rather than default.
Tracked as finding H-14.

## Failure reporting

Unexpected server failures are written as a single line of JSON to the
platform's runtime logs. There is no external monitoring dependency and no
environment variable to configure.

Every entry carries exactly four fields:

| Field | Meaning |
| --- | --- |
| `scope` | Always `server`. The public sign-in surface logs separately under `public-sign-in`. |
| `failureKind` | A coarse category — the error's class name, or `UnhandledError` / `UnknownFailure`. |
| `route` | The route that failed, as a route pattern rather than a concrete URL. |
| `correlationId` | The platform request id (`x-vercel-id`) when the request supplied one, otherwise a generated id. |

An entry deliberately has **no message and no free-form detail field**. There is
nowhere to put a phone number, a credential value, a class or device token, or a
database error message, so none of those can reach a log through this path. The
error's message is never recorded — only its class name.

### Reading a failure

1. Open the Vercel dashboard for the project, select the deployment, and open
   **Runtime Logs**. Filter on `"scope":"server"`.
2. The same lines are available from the CLI with `vercel logs <deployment-url>`.
3. To trace one specific failure, copy its `correlationId` and filter the logs
   for that value. The same id appears in the response the operator received, so
   a report of "this failed" can be matched to a log line.

### What is not reported

- **Client-side render errors** caught by a route's `error.tsx`. Those are
  shown to the operator with a retry action; they are not sent to the server,
  so they do not appear in the logs.
- **Failures that are handled and returned as a generic response** are still
  logged before the response is sent, so a staff route that answers `404` for an
  unauthorized caller leaves a trace with its failure kind.

## Database environments

See `docs/environment-workflow.md` for the day-to-day workflow. The topology:

- **Production** — a dedicated database, protected, holding only reusable data
  and the administrator. Built from committed sources; never modified in place.
- **Development** — the former production database, holding historical test data
  as fixtures; local `.env` and Vercel preview/development point here.
- **Test** — `roster_integration` and `roster_e2e`, reset with `db:reset:*`.

| Environment | Database | Deployed by | Configuration |
| --- | --- | --- | --- |
| Production | new production database | Vercel, `main` branch | Vercel Production `DATABASE_URL` |
| Development | former production database | Vercel preview/development | local `.env` `DATABASE_URL` |
| Test (integration) | `roster_integration` | — | `TEST_DATABASE_URL` |
| Test (end-to-end) | `roster_e2e` | — | `E2E_DATABASE_URL` |

### Capturing reference data into source

`npm run export:reference` reads training codes, the approved curricula and their
chapters, and the MTU catalog from a database and writes committed JSON under
`scripts/data/`. It is strictly read-only, and the database is authoritative for
curricula and chapters. Host agencies and training sites are not exported; they
are created by hand.

### Provisioning a fresh database

`npm run provision` builds a fresh database from committed sources: migrations,
the foundation and reference seeds, the committed reference imports (curricula,
chapters, training codes, and the MTU catalog), and the administrator. It reads
and writes only its target database and never deletes rows; re-running is
idempotent. It refuses a protected production database unless
`--allow-production` is passed.

### The production guard

Maintenance and data commands — `db:migrate`, `db:seed`, `import:*`, `admin`,
and `db:reset:*` — refuse to run against a database named in
`PROTECTED_DATABASE_NAMES`. Pass `--allow-production` (or set
`ALLOW_PRODUCTION=1`) only for an approved production operation.
