## Why

A committed migration can silently fail to reach a database at four handoffs — generating it from the schema, recording it in the journal, carrying it from `dev` to `main`, and applying it to the target — and the repository has no automated guard at any of them. This has already bitten production once: its ledger recorded 8 applied migrations against 14 in the repository, with one migration genuinely unapplied, and nothing surfaced it until someone counted by hand.

## What Changes

- Add a read-only migration status command, `db:status`, that compares a target database's applied ledger to the committed journal and reports pending, missing, or out-of-order migrations without writing anything.
- Add continuous-integration checks for the committed migration set:
  - schema drift: fail when the schema no longer matches the committed migrations (a schema edit shipped without `db:generate`);
  - set integrity: every migration file has a journal entry and vice versa, and a published migration is never edited, renamed, or removed.
- Add a promotion check for pull requests into the default branch: `drizzle/` may only grow relative to the default branch (append-only).
- Record the guidance in `docs/`.

## Capabilities

### New Capabilities

- `migration-integrity`: guarantees that the schema, the committed migration set, and each environment's applied ledger stay consistent — schema changes ship as migrations, the committed set is internally consistent and append-only, drift between the committed set and a database is reportable, and promotion to the default branch cannot drop or rewrite a migration.

### Modified Capabilities

<!-- None. `database-environments` already governs isolation and the production guard; this adds a distinct integrity concern. -->

## Impact

- `scripts/` — a new read-only status script (sibling of `scripts/migrate.ts`).
- `package.json` — a `db:status` script and any check scripts wired into `check`/CI.
- `.github/workflows/ci.yml` — schema-drift, set-integrity, and promotion (append-only) checks.
- `docs/environment-workflow.md`, `docs/operations.md` — promotion and status procedure.
- No schema change and no change to how a migration is applied; the production migration stays a deliberate, guarded step.
