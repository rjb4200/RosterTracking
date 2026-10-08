## 1. Data model

- [x] 1.1 Add nullable signing columns to `finalization_revisions` (`signed_by_user_id`, `signed_by_name`, `signed_at`, `attestation_version`) and generate the migration
- [x] 1.2 Add the versioned attestation statement constant

## 2. Finalization and reopen services

- [x] 2.1 Restrict `finalizeClass` to the class's lead instructor and record the signer, signed-at, and attestation version on the new revision
- [x] 2.2 Restrict `reopenFinalizedClass` to Administrators and require a non-empty note
- [x] 2.3 Add the pure `attendeeInitials(name)` helper with unit tests

## 3. Review screen

- [x] 3.1 Offer the finalize-and-sign action (certification + typed name) only to the lead instructor
- [x] 3.2 Show the recorded signer and signed timestamp on a finalized revision

## 4. Fire roster rendering

- [x] 4.1 Install the updated KFS-1A template with signature/initials fields and update its checksum and mapping
- [x] 4.2 Populate the lead instructor's signature line and the instructor and attendee derived initials in the KFS-1A fields
- [x] 4.3 Keep the KBEMS-E16 and completion-certificate signature fields blank

## 5. Verification

- [x] 5.1 Add integration tests for lead-only finalization, stored signing facts, and Administrator-only reopen
- [x] 5.2 Add renderer tests asserting the KFS-1A signature and initials fields are populated and the form is flattened
- [x] 5.3 Run `npm run check`, `npm run test`, and `npm run test:integration`
