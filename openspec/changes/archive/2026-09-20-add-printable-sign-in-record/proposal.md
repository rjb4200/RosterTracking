## Why

Student sign-in is a legal attendance record, but the roster shows only name, participant type, agency, method, and hours. The attestation text, its version, the server timestamp, the originating address, the sign-in method, and the remembered device are stored but never presented, so there is nothing a class can print alongside its roster to evidence who attested what and when.

## What Changes

- Add a class sign-in record that presents each attendance with its attestation facts.
- Make the record printable and downloadable for an authorized instructor.
- Offer a checkbox on roster print and email actions to include the sign-in record with the roster.
- Include removed attendance with its removal reason and actor.
- Capture the sign-in record with the immutable finalization snapshot.

## Capabilities

### New Capabilities
- `class-sign-in-record`: the printable, class-scoped evidence of student attestations derived from immutable attendance facts.

### Modified Capabilities
None. The record is new behavior; existing roster and PDF requirements are unchanged.

## Impact

- Modules: instructor roster, official roster PDFs, finalization snapshot.
- UI: live roster page and official roster delivery options gain an "include sign-in record" choice.
- Data: read-only derivation from `attendance` and `attendance_attestations`; no new attendance fields.
- Privacy: originating address and device identifier appear only on authorized staff output.
