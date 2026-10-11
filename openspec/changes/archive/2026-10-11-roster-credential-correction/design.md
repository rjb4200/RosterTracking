## Context

See proposal.md — Why. Relevant current state:

- A student's credential is one row in `student_credentials` (`value` encrypted, `valueHash`, `maskedSuffix`), unique per `(student, type)`. The full value is decryptable (`decryptCredential`) and already decrypted for official roster PDFs.
- Sign-in staging hides credentials the student already has: `resolveRegularDetails` filters out existing types, and `stageRegularRequirements` / `prepareRegularFacts` throw `"Existing credentials cannot be replaced."`
- Reporting inclusion is resolved at confirmation into `attendance_reporting_contexts.included` and frozen again into `finalization_revisions.encrypted_snapshot` plus `summary.fireEligibleCount`.
- Staff class access is already bounded: `assertClassRosterAccess` (instructor-roster/services) and `requireAssignedInstructor` allow an assigned instructor or elevated staff (Administrator / Training Major). Instructors hold `classes.manage` but not `students.manage`.

## Goals / Non-Goals

**Goals:**
- One shared correction primitive used by both sign-in and staff paths.
- Correct a prompted credential, then carry the change into reporting inclusion and the unreported finalized revision.
- Keep the trust boundary the codebase already has: instructors only touch classes they are assigned to.

**Non-Goals:**
- No student self-service correction after sign-in (rejected: shared-device ambiguity and weaker auditability).
- No schema migration; correction updates existing rows.
- No correction of a finalized class: a finalized revision is immutable by database rule, so the existing Administrator reopen → re-finalize path remains the only way to change a finalized roster.
- No change to credit-hour or attendance-removal locking.

## Decisions

**1. One shared correction service, two entry points.** Add a `correctCredential` service that performs the row update, inclusion re-derivation, and conditional amendment. The sign-in path (Option A) and the staff path call it. Alternative: separate code per path — rejected, they must behave identically for reporting to stay correct.

**2. Replace in place.** Update `student_credentials` `value` / `valueHash` / `maskedSuffix` on the existing row and update `attendance_credential_snapshots` for the attendance. Alternative: deactivate + insert (the wording in the current `credentials` spec) — rejected: there is no credential history table, and an in-place update preserves the row identity used by snapshots. The `credentials` spec is modified to match. A value that already belongs to another student of the same type is rejected by `student_credentials_type_value_unique` and surfaced as a duplicate error.

**3. Re-derive inclusion in place; never touch a finalized revision.** For each requirement set on the class, recompute `attendance_reporting_contexts.included` from the corrected value using `includesParticipant`, so the next finalization reflects the fix. Correction is allowed only while the class is open. A finalized revision is immutable by database rule (`finalization_revisions_no_update`), so a correction on a finalized class is refused and the sanctioned path is Administrator reopen → re-finalize. Alternative: rewrite the revision snapshot — rejected; it conflicts with the deliberate database immutability guarantee, which the user chose to keep over silent amendment.

**4. Sign-in exposes all prompted credentials, unmasked, editable.** Change `resolveRegularDetails` to return every prompted credential with its decrypted current value as a default, and relax the "existing credentials cannot be replaced" guards in `participants.ts` and `attendance.ts` to allow a staged value for an existing type to replace it. The participant schema already keys credentials by `credentialTypeId`, so a staged value whose id already exists means "replace". `already_signed_in` short-circuit in `confirmAttendance` is untouched — Option A only affects fresh sign-ins.

**5. Staff UI is a per-attendee control.** Add a "Correct credentials" control to the review page attendee rows (reusing the `AttendanceControls` pattern and the same authorization) and to the live class roster. It shows each prompted credential unmasked with an invalid flag, requires a reason, and writes to the student's canonical credential. Alternative: a separate correction page — rejected, the attendee rows are the natural surface and already carry the correct access checks.

**6. Open-only is enforced in the service and the UI.** `canCorrectCredentials(status)` permits only `open`. The staff action and the review page offer correction only for an open class, and the live roster renders only for an open class. A finalized class is refused with a message pointing to the Administrator reopen path, leaving the immutability guarantee untouched.

## Risks / Trade-offs

- **A finalized roster cannot be corrected in place** → Mitigation: the control is not offered on a finalized class and the service refuses with a clear message directing the operator to the Administrator reopen → re-finalize path.
- **A correction on an open class must reach the finalization facts** → Mitigation: correction updates the live credential snapshots and recomputes inclusion, which is exactly what finalization reads, so the fix flows through without special handling.
- **Duplicate credential value across students** → Mitigation: rely on the existing unique index; map the violation to the existing "already in use" message.
- **Legacy unreadable credential on a correction surface** → Mitigation: treat an undecryptable value as "needs re-entry" and render an empty field rather than failing the surface.
- **Concurrent sign-in and staff correction** → Mitigation: perform the update and re-derivation in one transaction, locking the class row and the student credential row as existing roster services do.

## Migration Plan

No schema migration. The change is additive. Deploy order is not constrained; rollback is disabling the two new entry points (the sign-in correction field and the staff correction control), which leaves stored data valid.

## Open Questions

- Exact wording of the staff reason presets (single free-text note vs a preset list mirroring `CREDIT_ADJUSTMENT_REASONS`).
- Whether a corrected credential should also clear a stale `student_credentials.verification_status`.
- Whether the invalid flag is meaningful for prompted credentials without a value format (only FFN defines one today).
