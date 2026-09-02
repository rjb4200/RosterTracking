## Why

Staff need a durable class record before students can sign in or instructors can manage attendance. Class creation now connects the Phase 3 reference catalog to a controlled lifecycle and produces the class-specific entry point required by the next phase.

## What Changes

- Add class records with course, training-site, delivery-method, reporting-system, instructor, and lifecycle data.
- Add one or more scheduled class components so multi-session training retains its individual dates, times, and credited hours.
- Add a stepped, staff-only class-creation wizard that saves a draft and validates required details before opening a class.
- Add lifecycle transitions for draft, open, completed, finalized, and cancelled states, with authorized transition rules and audit events.
- Generate a random, class-specific student sign-in token, store only its hash, and present the resulting URL as a QR code.
- Add class-management permissions for instructors, Training Majors, and administrators.

## Capabilities

### New Capabilities
- `class-management`: Staff class records, components, instructors, reporting selections, lifecycle transitions, and audit trail.
- `class-sign-in-access`: Secure, class-specific student sign-in entry URLs and QR codes.

### Modified Capabilities
- None.

## Impact

- Adds class, component, instructor-assignment, and reporting-selection database tables and migrations.
- Extends staff permissions, reference-data services, protected navigation, and administrative UI routes.
- Introduces a QR-code dependency and public token-resolution route without implementing student authentication or attendance.
- Defers student sign-in, roster management, finalization, reporting submission, and official PDF generation to later phases.
