# Implementation Guide — establish-database-environments

Working companion to `tasks.md`. This plan is **build-forward and non-destructive**:
a fresh production database is provisioned from committed sources, and the existing
database is left untouched as the development/test database. Nothing is cleared or
deleted at any point.

Read `design.md` for the reasoning; this file is the "how".

## Golden rule for this change

> No step modifies an existing database. The export only reads. Provisioning only
> writes its own empty target. If a step would delete or overwrite rows elsewhere,
> stop — it is the wrong step.

## Order

```
record current db → export sources → review sources → import tooling
   → provision empty production → verify → protect/protect + repoint env
   → dev domain → dev branch + CI → isolation code → guards → docs → verify
```

---

## 1. Confirm scope and capture current state

- **1.1–1.2** — Fix the export set (training codes, agencies, sites, MTU) and record
  the administrator's username/role/FFN/level to recreate.
- **1.3** — Confirm `scripts/data/approved-curricula-aug2024.json` and
  `curriculum-chapters.json` reproduce the database counts (129 and 36).
- **1.4** — Record branch id `br-purple-bar-ae5bxra2`, database `RosterGenerator`,
  host `ep-winter-wind-aekrioxf.c-2.us-east-2.aws.neon.tech`. This becomes development.
- **1.5** — `neon: snapshots.create` on the current branch (safety).

## 2. Export reusable data to committed sources

Add `scripts/export-reference-data.ts` (`npm run export:reference`):

- Reads via `DATABASE_URL_DIRECT` with **SELECT only**.
- Writes deterministic JSON (stable sort, trailing newline) under `scripts/data/`:
  - `training-codes.json` (code, title, sourceRevision; active)
  - `curricula.json` (publisher, programTitle, version, additionalRequirements, sourceRevision; active — database-authoritative)
  - `curriculum-chapters.json` (books → chapters; active — database-authoritative)
  - `mtu-catalog.json` (kind, name, unitLabel, perClassQty, perStudentQty, rounding, requiresMileage, sortOrder, active)
- Host agencies and training sites are **not** exported; create them by hand.
- Confirm the export changed no rows in the source (the command is read-only).

## 3. Provisioning and import tooling

- **3.1** — Reuse the existing curricula, chapter, and training-code imports in one
  provisioning flow.
- **3.2** — MTU reconcile: upsert by `(kind, lower(name))`, do not overwrite edited
  quantities.
- **3.3** — Add `scripts/provision.ts` (`npm run provision`): migrate,
  `seedFoundation`, `seedReferenceData`, import curricula → chapters → training
  codes → MTU, then create the administrator.
- **3.4 / 3.5** — Verify target-only and idempotent (second run, no duplicates).

## 4. Build the new production database

- **4.1** — Create a **new empty database** (a newly created database is empty even
  on a branch that inherited others). Do not drop the inherited database.
- **4.2–4.3** — Run `npm run provision` against it; verify counts + administrator.
- **4.4** — Confirm the original database is byte-for-byte unmodified (rowcounts).
- **4.5** — Protect the production database/branch; set it default.
- **4.6** — Point the production-refusal guard at the new production database name.

## 5. Test-database preparation and command guards

- **5.1** — The full reset truncates then reseeds; because the import functions need
  an actor, create the actor account within the reset before importing sources.
- **5.2 / 5.3** — One shared guard (`refuseProductionTarget`) used by `reset-test-db`,
  `migrate`, `seed`, `import:*`, and `admin`, keyed to the protected production name(s),
  with an explicit `--allow-production` override.
- **5.4 / 5.5** — Verify fresh test DB is complete; verify guards refuse production.

## 6. Vercel configuration

- **6.1** — Production Branch = `main`.
- **6.2 / 6.3** — Per-environment `DATABASE_URL`: Production → new production DB;
  Preview + Development → development DB. Same secrets; `NEXTAUTH_URL` per origin.
- **6.4** — Keep `DATABASE_URL_DIRECT`, `TEST_DATABASE_URL`, `E2E_DATABASE_URL` off Vercel.
- **6.5** — Verify each deployment's target.

## 7. Development origin and domain

- **7.1** — Add `rosterdev.<domain>`; assign to the development environment/branch.
- **7.2** — Set development `NEXTAUTH_URL`.
- **7.3** — Confirm dev origin → development DB.
- **7.4** — Development has **no** live `RESEND_API_KEY` (sending is skipped and recorded).
- **7.5** — `noindex` the dev origin.

## 8. Repository, branch, and continuous integration

Do this **before** group 9 so code changes deploy to preview, not production.

- **8.1** — Create/push `dev`; work there.
- **8.2** — Protect `main` (PR + checks).
- **8.3** — `.github/workflows/ci.yml`: `npm ci && npm run check && npm test`.
- **8.4** — Actions secrets for test DBs + `AUTH_SECRET` + `CREDENTIAL_ENCRYPTION_KEY`;
  `concurrency` group to avoid collisions.
- **8.5** — Verify CI uses no production credentials.

## 9. Environment isolation in code

- **9.1** — Single discriminator (`VERCEL_ENV ?? "development"`); only `production` is live.
- **9.2** — `src/modules/classes/qr.ts`: outside production, never fall back to
  `VERCEL_PROJECT_PRODUCTION_URL`.
- **9.3** — `src/modules/student-sign-in/request-security.ts`: trust the project
  production domain only in production.
- **9.4 / 9.5** — Verify on the dev origin.

## 10. Documentation

- **10.1–10.4** — operations, verification, `.env.example`, isolation/guards.
- **10.5** — merge `docs/environment-workflow.md` into docs; link from README/operations.
- **10.6** — confirm `.gitignore` entries (already applied).

## 11. Verification

- **11.1–11.6** — smoke-test production and the dev origin; confirm suppressed email;
  confirm guards refuse production; confirm the original database is unmodified; record
  the rollback step and snapshot id.

## Rollback

Repoint the affected environment's `DATABASE_URL` to the previous database. Because
nothing is deleted and the original database is untouched, rollback is a configuration
change, not a restore.
