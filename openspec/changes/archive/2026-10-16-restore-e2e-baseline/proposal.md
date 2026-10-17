## Why

Applying `add-training-categories` surfaced a set of browser-suite failures that reproduce identically on the pristine baseline (verified with a stashed working tree). The end-to-end suite is red before any new work begins, and it has stayed red unnoticed because `npm run verify` deliberately excludes the browser suite while `docs/verification.md` still reports "Known issues: None". A red suite is no longer a trustworthy signal: a real regression would hide among the known failures.

## What Changes

- Restore the browser suite to green on the baseline by triaging every failing spec into one of three layers — stale test, accessibility defect, or product regression — and fixing the correct layer rather than blanket-editing specs.
- Fix the accessible names of the class-creation wizard's searchable catalog controls. The filter and value controls currently share overlapping accessible names (`"Filter Category"` and `"Category *"`), so `getByLabel("Category")` is ambiguous. Required state SHALL be conveyed with `aria-required`, not a glyph baked into the name.
- Correct stale test expectations that encode superseded behavior: FFN input normalization (tests expect raw digits, the input canonicalizes to `0000-0000`), MTU free-text fields now inside a collapsed `<details>`, and the renamed staff account-profile selector.
- Investigate the two runtime failures and fix the correct layer: cross-site sign-in currently ends on a Next.js **"Invalid Server Actions request"** error, and the live roster reaches a new sign-in via a full page navigation instead of a client-side refresh. Each is either a real regression against an existing requirement or a harness gap to be run under production semantics.
- Remove the order-dependent flake in `instructor-roster` (it shares the global staff account under `fullyParallel` on one database).
- Update `docs/verification.md` "Known issues" so the recorded state matches the suite.

## Capabilities

### New Capabilities

- `browser-test-suite`: the maintained Playwright browser suite runs green on the baseline, is deterministic (no order-dependent failures), and its result is a trustworthy gate signal.

### Modified Capabilities

- `class-creation-wizard`: searchable catalog controls expose distinct, non-ambiguous accessible names, with required state carried by `aria-required` rather than the label text.

## Impact

- **Tests**: `tests/e2e/` — `fire-roster-fields`, `search-select-autoselect`, `reporting-destinations`, `instructor-profiles`, `student-sign-in`, `cross-site-sign-in`, `live-roster`, `instructor-roster`, plus `tests/e2e/support/` helpers.
- **Application**: the searchable catalog control's accessible name (`class-creation-wizard` / `mtu-usage` fields); possibly the class-creation wizard, the student sign-in flow, or the live class page if the runtime investigation confirms a regression.
- **Docs**: `docs/verification.md`.
- **No** schema, migration, or database-API changes are expected.
- Existing requirements in `public-sign-in-reliability` and `live-class-command-screen` already mandate cross-site completion and no-reload refresh, so those fixes restore behavior rather than change requirements; no spec delta is needed unless the investigation finds the requirement itself must move.
