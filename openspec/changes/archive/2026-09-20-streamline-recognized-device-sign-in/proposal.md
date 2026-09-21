## Why

Returning students cannot get the fast path the design intends: the remembered-device cookie is scoped to `/sign-in` while the QR opens `/<public-code>`, so recognition never fires from a QR scan, and "Remember me" is an unchecked opt-in. A recognized student is then walked through separate confirmation, agency, and attestation screens instead of one action.

## What Changes

- Recognize a remembered device on every class entry path, including the public short code and raw token links.
- Replace the separate confirmation and review screens for a recognized student with one screen: name, masked FFN/KEMSIS, resolved agency, a single `Confirm & Sign In`, plus `Not me` and `Update my information`.
- Remember the device by default after a successful regular sign-in instead of requiring an unchecked opt-in.
- Allow a regular student to add the active agency they represent to their memberships, persisted only when attendance confirmation succeeds.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `student-identification`: remembered-device recognition applies on every entry path, is issued by default, and presents one recognized-student confirmation screen.
- `attendance-sign-in`: a student may add the represented active agency to their memberships at confirmation.

## Impact

- Modules: remembered-device cookie scope, sign-in page model and wizard, workflow state, attendance transaction.
- UI: the public sign-in page for recognized students; removal of the remember-me checkbox.
- Security: the cookie remains an opaque, hashed, revocable token and never proves attendance.
- Testing: recognized-device entry from the public short code becomes testable end to end.
