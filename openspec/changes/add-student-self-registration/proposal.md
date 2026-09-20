## Why

Regular student sign-in dead-ends for anyone who is not already on the roster. An unknown phone number only offers changed-number recovery or guest entry, so a new student can never become a regular student, never gets a remembered device, and every walk-in must be re-entered by hand. In practice staff must pre-register every student before a class, and nothing in the public flow can create a student.

## What Changes

- An unrecognized phone number starts a **new-student registration** step instead of dead-ending.
- One screen collects the minimum to create a profile: first name, last name, phone (prefilled from the lookup), email, any class-required student fields, the class-required credentials (FFN, KEMSIS ID, FEMA SID), and the agency represented today.
- The student record, its credential rows, the agency membership, the attendance, and the attestation are created in the single confirmation transaction.
- A new student is remembered on the device by default, so the next class is a one-action sign-in.
- Changed-number recovery and guest entry remain available as secondary options on the registration screen.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `student-identification`: an unknown phone number now offers new-student registration as the primary next step, with recovery and guest as secondary options.
- `attendance-sign-in`: confirmation may create a new regular student, their credentials, and their membership before recording attendance.

## Impact

- Modules: workflow state types, page model, participant staging, attendance confirmation, sign-in actions, sign-in page UI.
- Data: no schema change; uses the existing `students`, `student_credentials`, `student_agencies`, `attendance`, and attestation tables.
- Security: registration is rate-limited like other public staging writes; duplicate phones and credentials are rejected generically; the student directory is never exposed.
- Testing: unit coverage for the new step and staging, integration coverage for the creation transaction, and desktop plus mobile browser coverage for the full path.
