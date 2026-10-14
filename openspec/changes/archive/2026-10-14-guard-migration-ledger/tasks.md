## 1. Migration status command

- [x] 1.1 Add `scripts/migration-status.ts`: resolve `DATABASE_URL_DIRECT`, call `assertNotProtectedTarget`, and open a read-only connection
- [x] 1.2 Read `drizzle.meta`/journal entries and the applied ledger, then report each migration as applied, pending, or skipped (skipped = `when` before the database's greatest applied `created_at`)
- [x] 1.3 Report by tag (primary) and flag a hash mismatch on an applied tag as "edited"
- [x] 1.4 Add a `db:status` script to `package.json`

## 2. Migration set integrity and promotion checks

- [x] 2.1 Add `scripts/check-migrations.ts` with a `set` mode: every `drizzle/*.sql` has a journal entry and vice versa
- [x] 2.2 Add an append-only mode (`--base <ref>`): every migration present at the base ref is still present and byte-identical
- [x] 2.3 Add unit tests for both modes (orphan file, orphan entry, unchanged, edited, removed, appended) — `src/server/db/migration-ledger.test.ts`

## 3. Schema drift check

- [x] 3.1 Add a CI step that runs `npm run db:generate` and fails when it leaves a working-tree change
- [x] 3.2 Confirm `generate` runs offline (no database required) — verified: "No schema changes, nothing to migrate" with an empty diff

## 4. CI wiring

- [x] 4.1 Run the set-integrity check on every push and pull request in `.github/workflows/ci.yml`
- [x] 4.2 Run the append-only check on pull requests whose base is the default branch, fetching the base ref first
- [x] 4.3 Run the schema-drift step in the verify job

## 5. Documentation

- [x] 5.1 Document `npm run db:status` and the pre-migration check in `docs/environment-workflow.md`
- [x] 5.2 Document the promotion guard and how to read a status report in `docs/operations.md`

## 6. Verification

- [x] 6.1 `npm run check`
- [x] 6.2 `npm test`
- [x] 6.3 Exercise `db:status` against the development database — ran against the dev DB; it first exposed three backfilled rows (`0020` stored the tag string as its hash at a wrong `created_at`; `0021` and `0024` had hashes that did not match the committed files) plus one applied-but-not-committed row. The migrations' schema effects were confirmed present, the ledger rows were aligned to the committed hashes and `when`, and a re-run reports "In sync." (39/39, nothing pending, skipped, or edited)
