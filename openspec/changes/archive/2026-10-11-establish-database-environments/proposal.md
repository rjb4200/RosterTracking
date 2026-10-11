## Why

One Neon database serves both the application's production deploy and local development, so pre-launch test rows live where production will be, and there is no isolated development database or CI. The reusable data the department needs — approved curricula and their chapters, training codes, and the MTU catalog — is only partly reproducible from the repository; the rest exists only inside that database.

## What Changes

- Capture the reusable data that currently exists only in the database into committed sources, by a read-only export.
- Add provisioning that builds a fresh, empty database from committed sources alone; the existing database is left untouched and becomes the development/test database. No rows are cleared or deleted anywhere.
- Establish isolated database targets: a new production database, the existing database as development, and the existing automated-test databases.
- Wire environment-scoped configuration so production, preview/development, and automated tests can never share a database.
- Add a Git `dev` branch, protect `main`, and add continuous integration with its own database secrets.
- Complete test-database preparation so a fresh test database is repopulated with the full reference catalogs.
- Give the development environment a stable, distinct origin, and stop development from embedding, trusting, or emailing through the production origin or sender.
- Key cross-environment identity (link and QR base URL, trusted sign-in origins) off the deployment environment rather than the build mode.
- Make maintenance and data commands (migrations, seeds, imports, administrative commands) refuse to run against the production database by default.
- **BREAKING**: local development `DATABASE_URL` must point at the development database; it may no longer point at production.

## Capabilities

### New Capabilities
- `database-environments`: Isolated production, development, and automated-test databases with environment-scoped connection configuration, where production is protected and is never reachable from development or automated tests.
- `database-provisioning`: A fresh database built entirely from committed reusable-data sources, plus a read-only export that captures database-only reference data into those sources, so provisioning never modifies an existing database.
- `environment-isolation`: A stable, distinct development origin plus safeguards that keep non-production deployments from embedding, trusting, or emailing through the production origin or sender, with cross-environment identity keyed to the deployment environment.

### Modified Capabilities
- `application-foundation`: Strengthen test-database preparation so each mutable suite's database is repopulated with the full committed reference catalogs (curricula, curriculum chapters, training codes, agencies, sites), and state that no development or test target may be the production database.
- `public-sign-in-reliability`: Scope the trusted project production domain to the production environment, so a non-production deployment does not trust the live origin.

## Impact

- **Configuration**: Vercel environment variables scoped per environment (Production, Preview, Development), local `.env`, and `DATABASE_URL_DIRECT`.
- **Data**: a new production database provisioned from sources; the existing database repurposed as development; automated-test databases unchanged in purpose. No existing data is deleted.
- **Sources**: committed JSON sources under `scripts/data/` for training codes, approved curricula and chapters (database-authoritative), and the MTU catalog. Host agencies and training sites are intentionally not exported; they are created by hand where needed.
- **Scripts**: a read-only reference export; import wiring for the new sources; a provisioning command; production-refusal guards on the migration, seed, import, and administrative commands.
- **Repository and CI**: a new `dev` branch, protection on `main`, a continuous-integration workflow, and Actions secrets for the test databases.
- **Networking**: a stable development subdomain mapped to the development environment, separate from the production domain.
- **Email**: development email delivery disabled or redirected so no live message reaches a real recipient from the production sender.
- **Documentation**: `docs/operations.md`, `docs/verification.md`, `docs/environment-workflow.md`, and `.env.example`.
- **Application code**: small changes to key cross-environment identity — link and QR base URL, trusted sign-in origins — keyed to the deployment environment instead of the build mode. The database is still selected purely through `DATABASE_URL` per environment.
