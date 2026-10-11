## Context

See `proposal.md` — Why. The current state that shapes the approach:

- The application reads exactly one variable, `DATABASE_URL`, validated in `src/server/env.ts`; it has no environment concept of its own.
- Local `.env` and the Vercel production deploy currently resolve to the **same** Neon compute host (`ep-winter-wind-aekrioxf`), branch `br-purple-bar-ae5bxra2`, database `RosterGenerator`.
- That database holds 39 classes (31 finalized with 35 immutable `finalization_revisions`), 2 students, 10 staff accounts (1 administrator, 1 instructor, 8 archived `e2e-*` fixtures), 755 audit rows, plus reusable data: 129 curricula, 36 chapters, 122 training codes, 25 MTU items, 6 agency tags, 4 reporting systems, 4 credential types, 4 agencies, 11 training sites.
- `finalization_revisions` carries `DO INSTEAD NOTHING` rules on UPDATE and DELETE, so finalized data cannot be removed by DML.
- Automated-test databases already exist and are isolated: `roster_integration` and `roster_e2e` on branch `br-wild-sun` (`br-wandering-grass-aewpbxzl`).
- **Reproducibility gap:** roles/permissions, credential types, agency tags, reporting systems, requirement sets, and the MTU catalog are seeded by code and migrations; **but the committed curriculum source is stale (128 rows against 129 in the database) and 122 training codes exist only in the database.** Host agencies and training sites are not treated as reusable data — they are created by hand.
- The repository has one branch (`main`), no CI workflow, and no `vercel.json`. A `vercel-dev` Neon branch with `creation_source: "vercel"` shows the Neon/Vercel integration is installed.
- `docs/operations.md` records a prior incident where a snapshot restore run with `finalize: true` swapped the production branch under `DATABASE_URL`.

## Goals / Non-Goals

**Goals:**
- Produce a launch-ready production database containing reusable data and the administrator, **without deleting anything**.
- Reproduce the database-only reusable data (training codes, agencies, sites, MTU edits) as committed sources.
- Leave the current database untouched as the development/test database.
- Keep the immutable-finalization behavior exactly as migrated.
- Make the transition recoverable and reversible.

**Non-Goals:**
- No destructive clearing, truncation, or purge of any database.
- No change to the immutable-finalization behavior.
- No change to the purpose of the existing automated-test databases.
- No new monitoring, retention, or backup policy beyond the documented snapshot procedure.

## Decisions

### 1. Build production forward from committed sources; never clear a database
Production is a **fresh, empty database** provisioned by applying migrations, running the foundation and reference seeds, importing the committed sources, and creating the administrator. The existing database is never modified; it simply becomes the development/test database. This removes the destructive step entirely and removes the need for a clearing/purge capability. *Alternatives considered:* copy-then-clear a branch of the current database — rejected because it deletes rows and needs a guarded purge; snapshot restore — rejected because of the documented `finalize: true` hazard.

### 2. Capture database-only data with a read-only export
Training codes exist only in the database and the committed curriculum source is stale, so add a **read-only export** that writes training codes, the approved curricula and their chapters (treating the database as authoritative), and the MTU catalog to committed JSON under `scripts/data/`. The export only reads and only writes source files; it is deterministic (sorted output). Host agencies and training sites are deliberately excluded and created by hand. *Alternatives considered:* relying on the stale committed curriculum list — rejected because it silently drops rows.

### 3. Fresh empty target and a configurable production guard
A Neon branch copies its parent's data, so production is a **new empty database** (a newly created database is empty even on a branch that inherited others). Because the new database has a different name, the maintenance/data guard identifies production from **configured protected database name(s)** rather than a hard-coded `RosterGenerator`. *Alternatives considered:* a new Neon project (maximum isolation but splits snapshots/tooling) — acceptable fallback; reusing the `RosterGenerator` name is impossible on a branch that already has it.

### 4. Environment selection is configuration-only
Production, preview/development, and local each supply their own `DATABASE_URL`; Vercel environment scoping plus local `.env` fully determine the target. Keep `DATABASE_URL_DIRECT`, `TEST_DATABASE_URL`, and `E2E_DATABASE_URL` out of Vercel, matching `.env.example`.

### 5. Provisioning is target-only and idempotent
Provisioning reads and writes only its target database, and re-running creates no duplicates — each import upserts by identity and revives/reactivates existing records, matching the existing `reference-data-lifecycle` semantics.

### 6. Split test-database preparation and add command guards
Extend the full reset for the automated-test databases so a fresh test database is repopulated with the complete reference catalogs (curricula, chapters, training codes, agencies, sites), handling the fact that the import functions need an actor account by provisioning one as part of the reset. Add the production-refusal guard to the migration, seed, import, and administrative commands, with an explicit override for approved production operations.

### 7. Repository and deployment wiring
`main` is the production branch; a new `dev` branch and feature branches produce preview deployments on a non-production database; `main` is protected (PR + checks). Add a continuous-integration workflow using test-database secrets, with a concurrency guard so parallel runs do not collide on the shared test databases.

```
 GitHub main ─▶ Vercel Production ─▶ Neon production database  (new, protected, immutable)
 GitHub dev  ─▶ Vercel Preview    ─▶ Neon development database (the existing database)
 local       ─▶ .env              ─▶ Neon development database
 tests/CI    ─▶ CI local only     ─▶ roster_integration / roster_e2e
```

### 8. Key cross-environment identity off the deployment environment, not the build mode
Vercel sets `NODE_ENV=production` for preview deployments as well as production. Introduce a single environment discriminator (`VERCEL_ENV` where present, with a local fallback) and use it where cross-environment identity matters: the sign-in and QR base URL (`src/modules/classes/qr.ts`) and the trusted sign-in origins (`src/modules/student-sign-in/request-security.ts`). Secure-cookie and transport-security behavior is deliberately left to the existing production rules.

### 9. Non-production never inherits the production origin
`getClassSignInBaseUrl` and `trustedSignInOrigins` currently fall back to `VERCEL_PROJECT_PRODUCTION_URL`, which on any non-production deployment is the live domain. Outside production, derive the origin from the environment's own configuration and drop the production domain from the trusted set, paired with an explicit `NEXTAUTH_URL` per environment.

### 10. Email is suppressed outside production
The sender is a hardcoded constant (`src/modules/notifications/client.ts`) and sending depends only on `RESEND_API_KEY`. Keep the production sender, and require that non-production supplies no live provider credential, so the existing "no key → skipped" path records a skipped delivery.

## Risks / Trade-offs

- **Provisioned production differs subtly from the current database** → verify reusable counts against the source and spot-check before repointing; the current database remains as a comparison and fallback.
- **A new empty database on a copied branch also carries an unused inherited database** → ignore it; do not drop it (dropping is destructive). Alternatively use a new project.
- **Branch/endpoint confusion** (the `finalize: true` incident) → create the database and repoint environments explicitly; never use snapshot-restore with finalize.
- **Preview deployments are treated as live today** → verify the development origin still serves sign-in and QR flows after the discriminator change.
- **Import requires an actor account after a full reset** → provision the actor as part of the reset before importing reference sources.
- **Shared test databases collide** when CI runs concurrently with a local run → serialize CI with a concurrency group or give CI a dedicated database.

## Migration Plan

1. Record the current branch id, database name, and endpoint (it becomes the development/test database).
2. Add and run the read-only export to capture training codes, curricula and chapters, and the MTU catalog into `scripts/data/`.
3. Verify the committed curricula and chapter sources reproduce the database rows.
4. Create a new, empty production database.
5. Run provisioning against it: migrate → foundation/rerefence seeds → imports → administrator.
6. Verify reusable counts match the source and the administrator is present; confirm the existing database is unmodified.
7. Mark the production database/branch protected and set it as the deployment default.
8. Repoint Vercel Production `DATABASE_URL` to the new production database; local `.env` keeps the development database; verify preview uses a non-production database.
9. Add the development subdomain, `NEXTAUTH_URL`, suppressed email, and `noindex`.
10. Create and push the `dev` branch; protect `main`; add CI and secrets.
11. Apply the environment-discriminator code changes and the command guards; complete the test-database preparation.
12. Smoke-test production and the development origin; record the rollback step (repoint `DATABASE_URL`).

**Rollback:** repoint the affected environment's `DATABASE_URL` to the previous database. The current database is never mutated, so rollback is a configuration change, not a data restore.

## Open Questions

- Do we use a new empty database on a new branch (one project, one snapshot set) or a new Neon project (maximum isolation)? Default: new empty database on a new branch.
- Should the development database be periodically re-synced from production, or remain a long-lived drifting sandbox?
- Adopt Vercel/Neon branch-per-preview automatically, or pin preview to the shared development database?
