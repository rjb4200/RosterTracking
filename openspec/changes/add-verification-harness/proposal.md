## Why

There is no single command a developer can run to know whether a change broke something, and the mutable suites are not reproducible: the integration suite and the end-to-end suite share one database that accumulates rows across runs, three end-to-end specs seed a different database than the server reads, and two specs navigate away before the sign-in session exists. The full suite cannot go green in any configuration today, so regressions are found by hand rather than by a gate.

## What Changes

- Add a documented combined verification command that runs the deterministic suite (lint, static types, unit tests, integration tests, production build) and a separate browser smoke tier that exercises critical journeys.
- Add a fast inner-loop command that runs lint and static type checking alone.
- Give each mutable suite its own database: integration keeps its existing database, and end-to-end gains a dedicated database that is migrated and seeded from committed artifacts before a run.
- Add a reset step that applies committed migrations and seed data to the end-to-end database, and tolerates a suspended database compute on first connection.
- Repair the end-to-end harness so every spec resolves one database and waits for the authenticated session before navigating.
- Tag a read-only critical-journey smoke subset that can run without mutating application data.
- Record the verification commands where future changes will find them.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `application-foundation`: the "Automated quality checks" requirement expands to cover a combined verification command, isolated and resettable mutable test databases, and end-to-end journey coverage that does not require production credentials.

## Impact

- Affected code: package scripts, Playwright configuration and specs, the Vitest integration setup, a new database reset script, and environment keys for the dedicated end-to-end database.
- Provisioning: one additional empty database on the existing Neon test branch. Migrations and seeds are applied from the committed `drizzle/` artifacts at reset time, so no reliance is placed on Neon branch synchronization.
- Behavior risk: the reset step must never target the production database, and no verification command may require production credentials.
- Out of scope: CI pipelines, git hooks, and converting the read-only smoke subset into a mutating suite.
