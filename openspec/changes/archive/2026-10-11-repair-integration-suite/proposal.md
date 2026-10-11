## Why

The integration suite is red — 21 of 100 tests fail across 8 files, and the failure count varies between runs (18–21) — so `npm run verify` and any CI gate cannot be trusted to catch regressions. The failures were introduced when the Fire-class FFN requirement landed (`f6020f7 feat: reframe reporting as roster inclusion`) without updating the test fixtures, compounded by shared-database state leaking between test files.

## What Changes

- Give Fire-class instructor fixtures a valid FFN so class-creation fixtures satisfy the current requirement.
- Align the instructor-profile tests with current validation and authorization behavior.
- Reconcile the MTU catalog test expectations with the current seed and stop catalog items colliding across files.
- Make the mutable integration suite deterministic: no test file may leave rows that break a later file.
- Test and test-support code only; no production behavior changes.

## Capabilities

No spec-level behavior changes. This change repairs tests and test tooling, so it opts out of specs (`skip_specs: true`). It brings the implementation back into line with existing `application-foundation` requirements ("Mutable suites use isolated databases", "Repeated verification is reproducible") rather than changing them.

### New Capabilities
- (none)

### Modified Capabilities
- (none)

## Impact

- `tests/integration/*` — the 8 failing files and any shared fixtures or helpers.
- No `src/` behavior changes; if a genuine code defect is found it is raised separately, not folded in here.
- Unblocks `npm run verify` / `verify:full` and the CI workflow.
