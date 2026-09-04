## Why

Student sign-in records attendance, but instructors need a controlled roster to review the live class, add participants who cannot sign in, correct attendance, set credited hours, and verify that the class can be completed. Phase 6 provides those operational controls while retaining the attendance facts needed by later finalization and reporting.

## What Changes

- Add an instructor-facing live roster for open classes that shows active and removed attendance with the represented agency and credited-hours status.
- Allow authorized assigned instructors to add regular students or class-scoped guests manually, using the same class and reporting requirements as public sign-in.
- Allow authorized instructors to remove attendance through a retained, reasoned, audited state change rather than deletion.
- Allow authorized instructors to set a participant's credited hours with a required reason when the value differs from the class scheduled hours.
- Validate roster readiness before an open class can transition to completed, including attendance, required participation data, and credited-hour constraints.
- Add tablet- and desktop-focused coverage for instructor roster workflows.

## Capabilities

### New Capabilities
- `instructor-roster`: Live roster review, instructor manual attendance, attendance removal, credited-hour adjustments, and staff-facing roster behavior.

### Modified Capabilities
- `class-management`: Completing an open class requires roster validation in addition to the existing lifecycle rules.

## Impact

- Adds instructor roster routes, authorization policies, attendance-management services, audit events, and additive attendance metadata where needed.
- Reuses current class, student, agency, reporting-requirement, attendance, and guest-participant records without changing the public student sign-in pathways.
- Extends class-completion validation and adds unit, integration, and Playwright coverage for instructor tablet and desktop usage.
- Defers immutable finalization revisions, reporting submission, official roster PDFs, and production-hardening controls to later phases.
