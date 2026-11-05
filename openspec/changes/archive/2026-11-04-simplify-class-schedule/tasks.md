# Tasks

## 1. Schedule model

- [x] 1.1 Accept a duration per subject and derive ordered starts and ends from one class start; verify unit tests for single- and dual-subject schedules.
- [x] 1.2 Reject a derived schedule that leaves the class's department-calendar day; verify the day-boundary test.
- [x] 1.3 Derive the class scheduled total from the summed subject durations and keep the existing "ran long" credit carry; verify the unit and integration tests.
- [x] 1.4 Apply the class delivery method set to every subject and remove per-subject method overrides; verify the method tests, including legacy `hybrid`.
- [x] 1.5 Normalize an existing open class's starts, ends, and methods on save; verify an integration test with a gapped or mixed-method class.

## 2. Class creation wizard

- [x] 2.1 Add a duration to each Fire subject row and derive the second subject's start from the first subject's end; verify the browser test.
- [x] 2.2 Collect one class start, show a single duration for a non-Fire class, and show the summed total for a Fire class; verify the browser test.
- [x] 2.3 Update the review summary to show the class start, derived subject times, and summed total; verify the review test.

## 3. Review workspace

- [x] 3.1 Show derived subject times and edit only durations; recalculate later subjects and the class total on save; verify the browser test.
- [x] 3.2 Replace the per-subject method editor with the class-level method set; verify the browser test.
- [x] 3.3 Verify increasing a subject duration raises the class total and carries full credit to participants still at the previous total; verify the browser test.

## 4. Integration checks

- [x] 4.1 Run `npm run check`, `npm run test`, and `npm run build`; verify all pass.
- [x] 4.2 Run the focused class-creation, review, KFS-1A, and certificate browser suites; verify they pass.
- [x] 4.3 Run `openspec validate simplify-class-schedule --strict`; verify it passes.

## Workflow follow-up

- Archive the change after the review and browser checks pass.
