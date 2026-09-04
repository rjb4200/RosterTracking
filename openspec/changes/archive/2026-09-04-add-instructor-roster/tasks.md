## 1. Roster data and authorization

- [x] 1.1 Review the Phase 5 attendance schema and add additive credited-hours, credit-adjustment, manual-attendance, and retained-removal fields, constraints, and indexes required by the instructor roster.
- [x] 1.2 Generate, review, and apply the Phase 6 migration without deleting or rewriting existing attendance, attestation, or snapshot records.
- [x] 1.3 Add server-side authorization that requires an assigned class instructor for roster reads and mutations while preserving existing staff authorization boundaries.
- [x] 1.4 Add roster query models that return active and removed attendance separately with participant, agency, sign-in method, credit, and retained removal details without exposing protected credential snapshots.

## 2. Attendance management services

- [x] 2.1 Add a staff-authorized manual regular-attendance transaction that validates the active student, class state, selected agency, effective reporting requirements, duplicate active attendance, snapshots, scheduled-hour default, and same-transaction audit event.
- [x] 2.2 Add a staff-authorized manual guest-attendance transaction that validates class-scoped guest data, active agency, reporting requirements, snapshots, scheduled-hour default, and same-transaction audit event without creating a permanent student.
- [x] 2.3 Add a retained attendance-removal transaction that requires a reason, records actor and timestamp, preserves existing attendance facts, and permits a later active replacement only after removal.
- [x] 2.4 Add a credited-hours adjustment transaction that bounds values from zero through the class scheduled total, requires a reason for any non-default value, retains actor/timestamp/reason, and writes an audit event.
- [x] 2.5 Add class-completion roster validation that locks and rechecks the open class, requires active attendance, complete reporting context, and valid credited hours before allowing the completed transition.

## 3. Instructor roster interface

- [x] 3.1 Add a staff-only class roster route linked from eligible open and completed class views, with authorization-safe unavailable handling for unassigned instructors.
- [x] 3.2 Build responsive active and removed roster sections showing participant identity, type, agency, sign-in method, credited hours, and retained removal information.
- [x] 3.3 Add manual regular-student and guest attendance forms that collect eligible agency and missing class-required roster data with accessible validation feedback.
- [x] 3.4 Add credited-hours adjustment and reason controls with bounded input validation and clear current-credit status.
- [x] 3.5 Add an accessible attendance-removal confirmation flow requiring a reason and reflecting the retained removal result in the roster.
- [x] 3.6 Surface completion validation errors in the class lifecycle interface so staff can correct roster issues before completing the class.

## 4. Tests and documentation

- [x] 4.1 Add unit tests for instructor assignment authorization, scheduled-hour calculation, credit bounds and reasons, removal-state transitions, and roster-completion validation.
- [x] 4.2 Add integration tests for the Phase 6 migration, manual regular and guest attendance, active-attendance uniqueness, retained removal and replacement, credit adjustment audits, authorization denial, and completion locking.
- [x] 4.3 Add tablet and desktop Playwright coverage for viewing the roster, manual attendance, credit adjustment, removal confirmation, unassigned access denial, and blocked or successful completion.
- [x] 4.4 Update architecture and roadmap documentation with instructor roster authority, retained removal, credit-adjustment bounds, and class-completion readiness rules.
- [x] 4.5 Run lint, typecheck, unit/integration/E2E tests, migration checks, production build, and strict OpenSpec validation; resolve all failures.
