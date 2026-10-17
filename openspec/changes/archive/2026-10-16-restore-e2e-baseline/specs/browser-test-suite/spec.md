## ADDED Requirements

### Requirement: The browser suite is green on the baseline

The maintained Playwright browser suite (`npm run test:e2e`) SHALL pass on the committed baseline, across the projects it runs, with no unrecorded failing specs. Every spec that is excluded, skipped, or known to fail SHALL be recorded as such with its reason and triage state, so the default run is not silently red.

#### Scenario: A clean run passes on the baseline

- **WHEN** the browser suite runs against a freshly reset end-to-end database on the committed baseline
- **THEN** every spec that is not explicitly recorded as skipped passes, and the run exits successfully

#### Scenario: No unrecorded known-red specs

- **WHEN** a spec fails on the baseline
- **THEN** it is either fixed or listed in the recorded known-failure state with a reason, never left as an unexplained red

### Requirement: The browser suite is deterministic

The browser suite SHALL produce the same result regardless of execution order and parallelism. Specs that mutate shared data SHALL isolate their fixtures, or serialize against the shared resource they touch, so that no spec depends on another spec's execution or on run order.

#### Scenario: A spec passes alone and in the full run

- **WHEN** a mutating spec is run in isolation and then as part of the full parallel suite
- **THEN** it passes in both, with no order-dependent failure

#### Scenario: Shared-resource specs do not interfere

- **WHEN** multiple mutating specs run concurrently against one end-to-end database
- **THEN** each uses fixtures scoped to itself, or serializes against the shared account or record it depends on, and no spec observes another's side effects

### Requirement: The recorded verification status matches the suite

The verification documentation SHALL state the current browser-suite status, including any known failures, and that recorded status SHALL match what the suite actually does. The documented pre-push gate SHALL include the browser suite.

#### Scenario: Known issues reflect reality

- **WHEN** the browser suite has known failures
- **THEN** the verification documentation lists them, and when it has none the documentation states that

#### Scenario: The pre-push gate covers the browser suite

- **WHEN** a contributor runs the documented pre-push verification command
- **THEN** the browser suite runs as part of it, so a browser-level regression is caught before pushing
