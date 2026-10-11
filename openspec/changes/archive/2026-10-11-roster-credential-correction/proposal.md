## Why

A student who mistypes or omits a prompted credential — most importantly the Fire FFN — is silently excluded from Fire roster reporting. A stored malformed or missing FFN is hidden from later sign-ins, and no one can correct it, so the student never reaches the roster unless the class is reopened. Two correction points are needed: the student can fix a prompted credential while signing in, and an assigned instructor can fix an attendee's credential after the fact.

## What Changes

- On the student sign-in recognized screen, every class-prompted credential is shown **in full (unmasked)**, prefilled and editable, and replacing an existing credential is allowed — not just filling a missing one.
- New **credential correction** behavior: replacing a prompted credential updates the student's canonical credential in place and re-derives the attendance's reporting inclusion. Correction is permitted **only while the class is open**; a finalized revision is immutable by database rule and is changed only through the existing Administrator reopen and re-finalize path.
- An **assigned instructor** (or elevated staff) can correct a roster attendee's prompted credentials from the review screen **and** the live class screen, with a **required reason**. Scope is limited to classes the actor is assigned to and credentials the class prompts; elevated staff may act on any class. This is the after-the-fact repair path that replaces student self-service correction.
- Correction surfaces show the full credential value; all other screens keep masked display.

## Capabilities

### New Capabilities
- `credential-correction`: replace a prompted credential for a student's attendance, re-derive reporting inclusion, and expose the instructor/staff correction scope, open-only rule, and reason requirement.

### Modified Capabilities
- `credentials`: allow full-value display and in-place replacement in correction contexts, while normal screens remain masked.
- `student-identification`: the recognized-student screen shows and allows correction of all prompted credentials, not only missing ones.
- `attendance-sign-in`: a corrected credential re-derives the attendance's reporting inclusion rather than the reporting facts being permanently frozen.
- `live-class-command-screen`: the live class screen and review screen offer credential correction while the class is open.

## Impact

- **Sign-in**: `src/modules/student-sign-in/` (`page-model`, `participants`, `actions`, `types`, `attendance`), `src/app/sign-in/`.
- **Reference/credentials**: `src/modules/reference/` (`services`, `masking`, `crypto`, `credential-format`, `inclusion`).
- **Staff roster**: `src/modules/credential-correction/`, `src/modules/instructor-roster/`, `src/app/staff/(protected)/classes/` (review page and live roster dashboard), class roster API.
- No schema migration is required; the existing `student_credentials`, `attendance_credential_snapshots`, and `attendance_reporting_contexts` tables are updated in place. `finalization_revisions` is intentionally left immutable.
