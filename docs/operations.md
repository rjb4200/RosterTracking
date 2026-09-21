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

## Migration state hazard

The production database records **8 applied migrations** while the repository
contains **14**. Six are recorded as unapplied:

| Migration | Effect | Actually present in production? |
| --- | --- | --- |
| `0005_graceful_glorian` | creates the attendance tables | **Yes** |
| `0006_parallel_cammi` | adds attendance credit columns | **Yes** |
| `0007_pink_doctor_octopus` | tightens the credited-hours constraint | **Yes** |
| `0008_abandoned_sunset_bain` | creates the finalization tables | **Yes** |
| `0009_medical_colleen_wing` | adds class public code and PIN columns | **Yes** |
| `0013_numerous_ozymandias` | narrows the `classes_status` constraint | **No** |

Five of the six have been applied out of band, so the ledger disagrees with
reality; the sixth genuinely is not applied, and the `classes_status` constraint
still permits `draft` (`draft` row count is 0, so applying it is data-safe).

**Running `npm run db:migrate` against production as it stands would attempt to
re-run `0005`, fail on the already-existing `attendance` table, and stop before
reaching `0013`.** The migration ledger must be reconciled first — either by
marking the five out-of-band migrations as applied, or by applying `0013`
directly and recording it. Do not run the migrator against production until this
is resolved.

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
