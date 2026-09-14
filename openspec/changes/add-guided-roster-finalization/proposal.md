## Why

Instructors currently move between a roster route and finalization controls, and completing a class makes the roster read-only before post-class corrections are finished. A guided review must reflect the actual process: reconcile attendance, resolve credit exceptions, then deliberately lock the roster.

## What Changes

- Add a dedicated after-class roster review screen with one finalization path.
- Keep public sign-in closed after a class enters completed review while permitting authorized roster corrections until finalization.
- Present scheduled hours, active and removed attendance, manual correction tools, adjustment reasons, readiness errors, and finalization in one guided flow.
- Preserve existing auditing, server-side reporting validation, immutable snapshots, reporting statuses, official-roster access, and audited reopening.

## Capabilities

### New Capabilities

- `guided-roster-finalization`: Instructor-focused post-class review experience that leads to a deliberate finalized roster.

### Modified Capabilities

- `class-management`: Treat completed classes as roster-review state with public sign-in closed and finalized classes as the normal edit lock.
- `instructor-roster`: Permit authorized roster corrections during completed review and guide credited-hour reasons.
- `finalization-reporting`: Surface readiness, reporting destinations, and immutable finalization from the review workflow.

## Impact

- Affects class lifecycle and roster authorization services, staff class routes and actions, roster/finalization controls, responsive styles, audit-preserving tests, and E2E coverage.
- No database migration is expected because attendance adjustments, reason storage, snapshots, reporting statuses, and audit events already exist.
