## Context

See `proposal.md` — Why. Current state that shapes the approach:

- `drizzle/` holds 39 committed migrations (`0000`…`0038`) and `drizzle/meta/_journal.json` holds 39 matching entries; today they agree, but nothing enforces it.
- `scripts/migrate.ts` applies migrations with `drizzle-orm`'s migrator against `DATABASE_URL_DIRECT`, guarded by `assertNotProtectedTarget`. Integration CI resets a blank test database and runs `migrate()`, so a broken migration is caught — but a *missing* or *unapplied* one is not.
- The migrator applies only journal entries whose `when` is strictly greater than the greatest recorded `created_at`; a migration ordered before that point is skipped silently, and editing an applied migration changes its hash but not its `when`.
- Production migration is a deliberate, documented manual step (`docs/environment-workflow.md`) with the `--allow-production` override; production once recorded 8 applied migrations against 14 committed.
- `ci.yml` runs `check`, unit tests, `build`, and integration tests on pushes and pull requests, with no migration-specific validation.

## Goals / Non-Goals

**Goals:**
- Detect a missed migration at each of the four handoffs: generate, journal, promotion, apply.
- Provide a read-only way to compare any target database's ledger to the committed set.
- Keep the production migration a deliberate step; add detection, not automation.

**Non-Goals:**
- Auto-applying migrations on deploy or at application startup.
- Changing `drizzle-kit` or the migrator's behavior.
- Blocking application boot when migrations are pending (a runtime surface is out of scope).

## Decisions

### D1 — A read-only `db:status` command mirrors `db:migrate`

Add `scripts/migration-status.ts`, read through the same `DATABASE_URL_DIRECT` + `assertNotProtectedTarget` path as `db:migrate`, which reads `drizzle.__drizzle_migrations` and the committed journal and reports, per entry, whether it is applied, pending, or skipped — where "skipped" means its `when` precedes the database's greatest applied `created_at`. It opens a read-only transaction and performs no DML.

- **Why**: it is the only check that sees the database, and it is the mirror of the action that already exists.
- **Alternatives**: a documented SQL snippet (not repeatable, easy to get wrong); a dry-run mode on the migrator (none exists upstream).

### D2 — Integrity and promotion checks are one script with modes, run in CI

Add `scripts/check-migrations.ts` with two modes: a **set** check (every `drizzle/*.sql` has a journal entry and vice versa) and an **append-only** check (`--base <ref>`: every migration present at the base ref is still present and byte-identical). Wire both into `ci.yml`; the append-only mode runs against the pull request's base branch.

- **Why**: a tested script is more reliable than shell in YAML, and both checks are pure git/filesystem work.
- **Alternatives**: inline shell in the workflow (untestable); relying on review (no enforcement); `drizzle-kit check` (validates snapshot collisions, not file/entry parity or git history).

### D3 — Schema drift is detected by generating and diffing

In CI, run `npm run db:generate` and fail if it leaves a working-tree change, meaning the schema no longer matches the committed migrations.

- **Why**: `generate` diffs the schema against the committed snapshots offline, so it needs no database, and it directly answers "did a schema edit ship without a migration?"
- **Alternatives**: `drizzle-kit check` (does not detect a missing migration); hand-comparing snapshots.

### D4 — Promotion is enforced in CI, not by policy alone

The append-only check runs on pull requests whose base is the default branch, failing a promotion that drops or rewrites a migration.

- **Why**: `docs/environment-workflow.md` already says migrations are forward-only and reviewed; this makes the rule testable.
- **Alternatives**: branch protection with a manual confirmation step (not machine-checked).

### D5 — Detection only; production migration stays deliberate

None of the checks apply a migration. `db:status` is the operator's tool before the existing guarded `db:migrate --allow-production` step.

- **Why**: `environment-workflow.md` treats production migration as its own approved step; automation would change that contract.

## Risks / Trade-offs

- **`generate` in CI noise** → the drizzle version is lockfile-pinned; a version bump that changes output is a deliberate, reviewed change.
- **Append-only check needs the base ref** → the workflow fetches the base branch before the check.
- **Hash drift across drizzle versions** could false-positive `db:status` → report by tag as the primary signal and treat a hash mismatch on an applied tag as "edited", so the failure is specific rather than a count mismatch.
- **No runtime surface** means a deploy that skips the migrate step is still caught only by running `db:status` or its consequences → accepted for this change; a boot check can be a later change.

## Migration Plan

1. Add `scripts/migration-status.ts` and `npm run db:status`.
2. Add `scripts/check-migrations.ts` with `set` and append-only modes, plus unit tests.
3. Wire the three checks into `ci.yml`.
4. Update `docs/environment-workflow.md` and `docs/operations.md` with the promotion and status procedure.
5. **Rollback**: revert the commit; all additions are additive and touch no schema.
