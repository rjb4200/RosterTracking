## 1. Shared correction service

- [x] 1.1 Add a shared `correctCredential` service that, in one transaction, validates the new value against the credential type's format, updates `student_credentials` in place, updates the attendance's `attendance_credential_snapshots`, recomputes that attendance's `attendance_reporting_contexts.included` via `includesParticipant`, and writes an audit event
- [x] 1.2 Map the `student_credentials_type_value_unique` violation to the existing "credential already in use" error
- [x] 1.3 Add a helper that lists a class's prompted credentials for an attendee with their decrypted current value and an invalid-format flag
- [x] 1.4 Treat a legacy undecryptable stored value as empty for display rather than failing

## 2. Open-only correction guard

- [x] 2.1 Add `canCorrectCredentials(status)` permitting correction only while the class state is `open`
- [x] 2.2 Refuse a correction on a finalized or cancelled class with a clear message, leaving the immutable `finalization_revisions` row untouched (correction is not offered and the service rejects it)
- [x] 2.3 Audit the correction with the actor, reason, and the before/after masked suffix

## 3. Sign-in correction (Option A)

- [x] 3.1 Change `resolveRegularDetails` (`student-sign-in/page-model.ts`) to return every prompted credential with its decrypted current value instead of only the missing ones
- [x] 3.2 Relax the "existing credentials cannot be replaced" guards in `student-sign-in/participants.ts` and `student-sign-in/attendance.ts` so a staged value for an existing type replaces it
- [x] 3.3 Render prompted credentials on the recognized and detail steps prefilled with their current value, unmasked, and editable (keep them optional)
- [x] 3.4 Stage a replacement through the participant `credentials` array keyed by `credentialTypeId`
- [x] 3.5 Validate a replacement against the credential format and surface the existing FFN-format notice

## 4. Staff correction (Option C)

- [x] 4.1 Add a server action that authorizes with `classes.manage` plus the class-operator check, requires a non-empty reason, and calls the shared service
- [x] 4.2 Add a per-attendee "Correct credentials" control to the class review page showing each prompted credential unmasked with an invalid flag, offered while the class is open
- [x] 4.3 Add the same control to the live class roster dashboard (`live-roster.tsx` and its refresh payload)
- [x] 4.4 Restrict the offered credentials to those the class prompts and deny unrelated instructors with the existing roster message

## 5. Verification

- [x] 5.1 Unit-test the shared service: replace in place, duplicate rejection, format rejection, inclusion re-derivation
- [x] 5.2 Test the open-only guard: an open class correction is applied, a finalized class is refused, and the open-class correction is reflected at finalization
- [x] 5.3 Test the access scope: assigned instructor and elevated staff succeed, unrelated instructor is denied, only prompted credentials are offered
- [x] 5.4 Integration-test a student correcting an FFN at sign-in and appearing on the Fire roster
- [x] 5.5 Integration-test an instructor correcting an attendee's FFN on an open class and the Fire roster reflecting it at finalization
- [x] 5.6 Run lint and typecheck
