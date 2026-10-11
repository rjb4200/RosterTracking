## 1. Confirm scope and capture current state

- [x] 1.1 Confirm the export set: training codes, curricula, chapters, and the MTU catalog (host agencies and training sites are excluded; created by hand)
- [x] 1.2 Confirm the administrator account is recreated by provisioning (record username, role, FFN, and instructor level) — provisioned administrator `rjb4200`
- [x] 1.3 Verify the committed curricula and chapter sources reproduce the database rows — resolved by making the database authoritative (exported to `scripts/data/curricula.json` and `curriculum-chapters.json`)
- [x] 1.4 Record the current branch id, database name, and endpoint (this database becomes the development/test database) — `br-purple-bar-ae5bxra2` / `RosterGenerator` / `ep-winter-wind-aekrioxf`
- [x] 1.5 Take a snapshot of the current database as a safety point before the export — `snap-square-truth-aelb16kk`

## 2. Export reusable data to committed sources

- [x] 2.1 Add a read-only export command that reads the reusable tables and writes committed JSON sources deterministically
- [x] 2.2 Export training codes to `scripts/data/training-codes.json`
- [x] 2.3 Export approved curricula to `scripts/data/curricula.json` (database-authoritative)
- [x] 2.4 Export curriculum chapters to `scripts/data/curriculum-chapters.json` (database-authoritative)
- [x] 2.5 Export the MTU catalog to `scripts/data/mtu-catalog.json`
- [x] 2.6 Verify the export modified no rows in the source database

## 3. Provisioning and import tooling

- [x] 3.1 Wire the existing curricula, curriculum-chapter, and training-code imports into a single provisioning flow
- [x] 3.2 Add an MTU catalog reconcile that upserts committed entries without duplicating or overwriting edited values
- [x] 3.3 Add a single provisioning command: migrate, foundation seed, reference seed, source imports, then create the administrator
- [x] 3.4 Verify provisioning reads and writes only its target database and modifies no other
- [x] 3.5 Verify a second provisioning run creates no duplicates

## 4. Build the new production database

- [x] 4.1 Create a new, empty production database (no destructive action on the existing database) — new project `green-paper-44365360` ("RosterGenerator-Production"), database `roster_production`
- [x] 4.2 Run provisioning against it
- [x] 4.3 Verify reusable counts match the sources and the administrator account and roles are present
- [x] 4.4 Confirm the existing database is unmodified and still usable as development/test
- [x] 4.5 Mark the production database/branch protected and set it as the deployment default
- [x] 4.6 Update the production-refusal guard to identify the new production database name(s) — `PROTECTED_DATABASE_NAMES=roster_production`

## 5. Test-database preparation and command guards

- [x] 5.1 Extend the full test reset to provision an actor and re-import curricula, chapters, and training codes
- [x] 5.2 Update the production-name guard so it distinguishes the production database from the development database
- [x] 5.3 Add the production-refusal guard to the migration, seed, import, and administrative commands, with an explicit override for approved production operations
- [x] 5.4 Verify `db:reset:integration` and `db:reset:e2e` produce the full reference catalogs on a fresh database — reset verified (curricula=126, chapters=36, trainingCodes=122) and the integration suite is green (100/100, stable across runs)
- [x] 5.5 Verify a maintenance command invoked against the production database refuses by default — `db:migrate`, `db:seed`, and `provision` all refuse `RosterGenerator` without `--allow-production`

## 6. Vercel configuration

- [ ] 6.1 Confirm the Vercel project's Production Branch is the repository's default branch
- [ ] 6.2 Set the Production `DATABASE_URL` to the new production database endpoint and keep the shared secrets consistent
- [ ] 6.3 Set the Preview and Development `DATABASE_URL` to the development database; choose branch-per-preview or a pinned database
- [ ] 6.4 Ensure `DATABASE_URL_DIRECT`, `TEST_DATABASE_URL`, and `E2E_DATABASE_URL` are absent from Vercel
- [ ] 6.5 Verify a production deployment connects to production and a preview deployment connects to a non-production database

## 7. Development origin and domain

- [ ] 7.1 Add the development subdomain and assign it to the development branch or environment
- [ ] 7.2 Set the development `NEXTAUTH_URL` to the development origin
- [ ] 7.3 Confirm the development origin resolves to the development database and never production
- [ ] 7.4 Disable or redirect email delivery in the development environment and ensure no live provider credential is present
- [ ] 7.5 Mark the development origin `noindex` and confirm deployment protection for previews remains appropriate

## 8. Repository, branch, and continuous integration

- [ ] 8.1 Create and push the `dev` branch and move development work onto it so subsequent code changes deploy to a preview environment, not production
- [ ] 8.2 Protect `main` by requiring a pull request and passing checks
- [x] 8.3 Add a continuous-integration workflow that runs the deterministic checks
- [ ] 8.4 Add Actions secrets for the test databases and required secrets, and a concurrency guard so parallel runs do not collide
- [ ] 8.5 Verify continuous integration runs against non-production databases and never requires production credentials

## 9. Environment isolation in code

- [x] 9.1 Introduce a single environment discriminator from the deployment environment with a local fallback
- [x] 9.2 Use the discriminator for the sign-in and QR base URL so non-production never falls back to the production domain
- [x] 9.3 Use the discriminator for trusted sign-in origins so non-production does not trust the production domain
- [ ] 9.4 Verify QR codes and sign-in links generated outside production use the environment's own origin
- [ ] 9.5 Verify a sign-in mutation outside production is not accepted from the production origin

## 10. Documentation

- [x] 10.1 Update `docs/operations.md` with the branch topology, the environment matrix, and the provisioning procedure
- [x] 10.2 Update `docs/verification.md` for the completed test-database preparation
- [x] 10.3 Update `.env.example` to document the production, development, and test database variables, the environment discriminator, and the development origin
- [x] 10.4 Document the environment-isolation rules and the production-refusal guards for maintenance commands
- [x] 10.5 Merge the workflow runbook (`docs/environment-workflow.md`) into the project docs and link it from the README and `docs/operations.md`
- [x] 10.6 Confirm `.env.production` and `.env.development` are ignored in `.gitignore` (already applied; verify after commit)

## 11. Verification

- [ ] 11.1 Smoke-test the application against the production database and confirm reusable data and the administrator are present
- [ ] 11.2 Smoke-test the application against the development origin, including sign-in and QR generation
- [ ] 11.3 Confirm email is suppressed in development and no live message is delivered
- [x] 11.4 Confirm the production database cannot be modified by the maintenance commands because they refuse it — `db:migrate` refuses `roster_production` without `--allow-production`
- [x] 11.5 Confirm the pre-existing database was not modified by provisioning — unchanged: 39 classes, 2 students, 10 users, 129 curricula, 122 codes
- [ ] 11.6 Record the rollback step (repoint `DATABASE_URL`) and confirm the pre-change snapshot is restorable
