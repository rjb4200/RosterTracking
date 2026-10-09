## 1. Data and schema

- [x] 1.1 Add `email_deliveries` to the schema with template, source reference, recipient, sender, status (`queued`/`sent`/`failed`/`skipped`), content fingerprint, provider message id, attempt count, and timestamps; generate the migration
- [x] 1.2 Add an `email` column to `class_guests`; generate the migration
- [x] 1.3 Extend `FinalizationSnapshot` with a per-participant recipient email and populate it at finalization from `students.email` for regular attendees and `class_guests.email` for guests
- [x] 1.4 Add delivery-state types and reads for the review screen (delivered, undeliverable, failed) derived from `email_deliveries`

## 2. Email foundation

- [x] 2.1 Create `src/modules/notifications` with a shared Resend client using `RESEND_API_KEY` and the `noreply@winchesterfireems.com` sender
- [x] 2.2 Add a typed, versioned certificate message template that renders a branded HTML body
- [x] 2.3 Implement enqueue, post-commit dispatch (via `after()`), status recording, and retry over `email_deliveries`; failures never throw into the caller
- [x] 2.4 Refactor `official-roster-pdfs` email delivery onto the shared client without changing its behavior or audit facts
- [x] 2.5 Add unit tests for enqueue/dispatch/failure/retry and provider-id audit; integration tests for delivery-record persistence

## 3. Student and guest email

- [x] 3.1 Require a valid email for new-student registration and enforce it server-side
- [x] 3.2 Prompt an identified regular student who lacks an email to provide one before confirming attendance, without overwriting an existing email
- [x] 3.3 Add an email field to the guest-details step, make it required, and persist it on `class_guests`
- [x] 3.4 Require an email on student create/edit and reject a missing email
- [x] 3.5 Add unit/integration/e2e coverage for the missing-email prompts and guest email persistence

## 4. Certificate signing and batch

- [x] 4.1 Verify the `Instructor_Signature` template field type; set it with the revision's attested signer name, or draw the typed name at the mapped coordinate when it is not a fillable text field
- [x] 4.2 Stop listing `Instructor_Signature` as a permanently blank field; render blank only when the revision has no attestation
- [x] 4.3 Update the generation audit to record whether the certificate was signed from the attestation instead of `signatureBlank`
- [x] 4.4 Add a single-participant certificate renderer and a `pdf-lib` student-list cover page (class + participant name, agency, credited hours)
- [x] 4.5 Compose the admin batch: cover page followed by one certificate page per active participant, in one PDF
- [x] 4.6 Add unit/visual tests for the signature line, the cover, batch composition, and removed-participant exclusion

## 5. Delivery at finalization

- [x] 5.1 Add a content-fingerprint function covering participant name, class/course name, class hours, course type, course number, completion date, and instructor name (excluding template version)
- [x] 5.2 During finalization of an EMS (KBEMS) class, enqueue one certificate delivery per active participant with a captured email, in the same transaction
- [x] 5.3 Dispatch queued deliveries after commit without blocking or rolling back finalization
- [x] 5.4 Suppress a send when the new fingerprint equals the participant's last sent fingerprint; record it as `skipped`
- [x] 5.5 Skip enqueueing participants without a deliverable email and surface them as delivery exceptions
- [x] 5.6 Add integration tests for send-on-finalize, non-EMS exclusion, removed-participant exclusion, unchanged suppression, and finalize-survives-failure

## 6. Resend and delivery exceptions UI

- [x] 6.1 Add a per-participant resend action (optionally with a different address) that follows the official-roster authority rule and records the recipient and actor
- [x] 6.2 Add the certificate delivery state and delivery-exceptions list to the review screen, with an action to provide an address and send
- [x] 6.3 Add certificate-batch View and per-participant delivery controls to the review screen, gated to operators who may generate certificates
- [x] 6.4 Add e2e coverage for resend, resend-to-different-address, and exception resolution

## 7. Retire the KBEMS-E16 output

- [x] 7.1 Remove KBEMS-E16 from the template set and the render dispatch; stop offering it as an output
- [x] 7.2 Remove the KBEMS-E16 row from the review documents section and update the "official rosters require finalization" copy to the singular roster
- [x] 7.3 Remove the KBEMS/MTU roster download from the reporting queue, keeping the Fire (KFS-1A) download
- [x] 7.4 Update README, `docs/verification.md`, and fixtures that assert the KBEMS-E16 output
- [x] 7.5 Add/adjust integration and e2e tests to assert the KBEMS-E16 output is no longer offered

## 8. Verification

- [x] 8.1 Run `npm run check`, `npm run test`, `npm run test:integration`, and `npm run build`
- [x] 8.2 Update the affected spec Purposes (`official-roster-pdfs`) and confirm the change validates
