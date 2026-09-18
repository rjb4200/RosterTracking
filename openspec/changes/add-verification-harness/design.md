## Context

See `proposal.md` for motivation. Current state that shapes the approach:

- `package.json` exposes separate `lint`, `typecheck`, `test`, `test:integration`, `test:e2e`, `build`, `db:migrate`, and `db:seed` scripts, but nothing runs them together, and `test` means unit tests only.
- There is no CI workflow and no git hook, so nothing runs automatically.
- Integration tests read `TEST_DATABASE_URL` and apply committed migrations in `beforeAll`. `database.test.ts` asserts exact counts of seeded reference data.
- Neon database `roster_integration` lives on branch `br-wandering-grass-aewpbxzl`, a child of the production branch. Neon does not synchronize schema or data between branches; each database keeps its own Drizzle migration journal.
- End-to-end specs are inconsistent: `class-creation`, `instructor-roster`, and `foundation` seed through `TEST_DATABASE_URL` directly, while `class-list-filters` and `finalization-reporting` resolve a separate end-to-end URL. Two specs also navigate away without waiting for the authenticated session.
- The test compute autosuspends, so the first connection after idle can time out and an immediate retry succeeds.

## Goals / Non-Goals

**Goals:**
- Mutable suites that produce the same result on a repeat run.
- One command that answers "did this change break something?" without a browser or a database.
- A separate, cheap browser check for page-level breakage that does not mutate data.
- A single place that decides which database a test suite talks to.

**Non-Goals:**
- Building a CI pipeline or installing git hooks.
- Per-test transactional isolation for the browser suite.
- Automating provisioning of the databases as part of the scripts.
- Replacing the shared Neon test project with local PostgreSQL.

## Decisions

### Give the browser suite its own database on the existing test branch

Add an empty `roster_e2e` database alongside `roster_integration` on the same Neon test branch, and point the browser suite at it. This reuses the endpoint already provisioned and removes the only real coupling between the two suites. A dedicated branch was rejected as extra endpoint and connection-string management for no isolation benefit; an ephemeral branch per run was rejected because a branch created from production inherits production *data*, so a clean run would still need a fresh database inside it and migrate and seed anyway.

### Schema comes from the repository, not from Neon

The reset step applies the committed migrations and seed data to the target database. Neon branch synchronization is deliberately not relied upon. A parent-reset was rejected because it would also copy production rows into a test database. Consequence: every schema change must land as a committed migration, which the project already assumes.

### One reset script, guarded against production

A single script takes a target database URL, refuses to run when the URL matches the production host or database name, applies migrations, clears application tables, and applies seed data. The guard exists because the failure mode is destroying live data. The combined verification command resets the integration database before the integration suite and the end-to-end database before the browser suite, which is what makes a repeat run reproducible.

### One database-resolution helper shared by every browser spec

All end-to-end specs resolve their database through the same helper, which prefers the end-to-end URL and falls back predictably. The current mix of direct `TEST_DATABASE_URL` reads and contextual resolution is the defect that makes the suite unwinnable in either configuration; consolidating it removes the class of bug rather than one instance.

### A shared sign-in helper that waits for the session

Every spec signs in through one helper that waits until the navigation leaves the login route before continuing. The two specs that navigate immediately after clicking sign in are relying on a race.

### Tier the commands by cost

- A fast check for lint and static types, used after each edit; no database, no browser.
- A combined `verify` covering lint, static types, unit tests, integration tests, and the production build. This is the per-change gate and stays free of browsers.
- A `verify:full` that adds the browser suites.
- A browser check that walks critical pages and asserts they render without errors. It is a tagged subset of the browser suite, runs first in `verify:full`, and can also run alone against a database that is not reset because it creates no domain records. Signing in does record the usual staff login audit event and update the account's last-login timestamp; that authentication bookkeeping is expected and is not a domain write.

Keeping the browser tiers out of `verify` was chosen over a single monolithic command so the common case stays fast and deterministic.

### Give the wizard's step-advance and submit controls distinct identities

The class wizard renders its action row as a single conditional: a `Next` button while steps remain, otherwise the `Create class` submit button. Both branches produce a `<button>` at the same position, so React reconciles onto one DOM node and only rewrites its `type` attribute. Advancing from the reporting step into the review step therefore turns the button the user just clicked from `type="button"` into `type="submit"` before the browser runs the click's default action, which submits the form and skips the review entirely.

Give each button its own React identity so the node is replaced rather than mutated, and confirm with the end-to-end assertion that the review step appears before creation. Neutralizing the default action on the advance handler was considered as an alternative but treats the symptom: the DOM node would still be rewritten mid-click. The repaired browser suite is the regression guard, which is why this repair lives in this change.

### Warm up the compute before a suite

The reset step retries its initial connection once, because the suspended test compute can time out the first attempt. Without this, a verification run can fail for a reason unrelated to the change.

## Risks / Trade-offs

- [The reset script is pointed at production] → It refuses to run when the target matches the production host or database, and requires an explicit target rather than defaulting to `DATABASE_URL`.
- [Test data drifts from production data] → Seeds are the intended baseline for test suites; if production-only data shapes behavior, that is a migration or seed gap to close in the repository.
- [Integration and browser suites contend on the shared branch compute] → The combined commands run suites sequentially rather than concurrently.
- [A read-only smoke check silently becomes mutating] → Keep mutating specs out of the smoke tag and review the tag when specs are added.
- [The wizard fix is verified only by a browser test that a future refactor could delete] → Keep the review-step assertion in the creation spec so the regression stays covered.
- [An extra database on one branch means a parent reset wipes both] → Documented; per-run resets make this recoverable.

## Migration Plan

1. Provision an empty `roster_e2e` database on the existing test branch.
2. Add the end-to-end database URL to local environment configuration and to any environment that runs the browser suite.
3. Land the reset script, the shared helpers, the spec repairs, and the new scripts together, since partial landing leaves the suite in the current unusable state.
4. Roll back by removing the scripts and pointing the browser suite back at the integration database, which restores the previous behavior.

## Open Questions

- Whether a CI pipeline should eventually run the full verification, which the current change deliberately leaves out.
- Whether the shared test branch should be split further if integration and browser suites ever need to run at the same time.
