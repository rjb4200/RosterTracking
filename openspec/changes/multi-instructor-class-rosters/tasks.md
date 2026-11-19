# Tasks

## 1. Instructor role schema and migration

- [x] 1.1 Add `is_assistant` to `class_instructors`, a partial unique index for one assistant per class, and a check preventing lead and assistant on the same row; run `npm run db:generate` and verify the migration and `npm run check:migrations -- set` succeed.
- [x] 1.2 Add a pre-migration data check that counts classes with more than one non-lead instructor; verify it returns zero or produces an explicit exception list before backfill.
- [x] 1.3 Backfill every current non-lead assignment as assistant and verify every class has exactly one lead, at most one assistant, and no role overlap.
- [x] 1.4 Add regression tests for the role constraints and migration backfill; verify `npm test` and the migration status report pass.

## 2. Instructor assignment model and Fire guard

- [x] 2.1 Replace the instructor write path with one operation accepting a lead, an optional assistant, and an additional-instructor list; verify role replacement, addition, removal, promotion, and role-conflict integration tests pass.
- [x] 2.2 Record every instructor role and ID in the class audit event; verify the audit integration test shows the full assignment set.
- [x] 2.3 Change Fire validation to require a fire-qualified lead only; verify tests reject an assignment set containing one fire assistant, and accept a non-fire assistant or additional instructor.
- [x] 2.4 Add an actionable validation error for existing open Fire classes whose lead is not fire-qualified on save and finalization; verify the integration test keeps the class unchanged and reports the lead requirement.
- [x] 2.5 Update class detail and form-option read models to expose lead, assistant, and additional instructors with their roles; verify read-model and page tests pass.

## 3. Class creation wizard

- [x] 3.1 Add lead, optional assistant, and additional-instructor controls to the class-and-schedule step; verify staff can create a class with a three-instructor team.
- [x] 3.2 Prevent the lead or assistant from also being an additional instructor; verify the wizard rejects conflicting role selections.
- [x] 3.3 Require a fire-qualified lead when Fire is selected and make the selected lead the only displayed Fire roster signer; verify wizard validation and review tests.
- [x] 3.4 Show the assistant and additional instructors separately in the review summary; verify the review presents all chosen roles and no separate Fire signer.
- [x] 3.5 Add browser coverage for team creation, role conflicts, and a Fire class with a non-fire lead; verify `npm run smoke` or the affected Playwright spec passes.

## 4. Review workspace and instructor editing

- [x] 4.1 Present the lead, assistant, and additional instructors as distinct controls in the review workspace; verify an operator can add and remove additional instructors without changing the lead or assistant.
- [x] 4.2 Show role badges and distinguish the two official roster instructors from additional instructors; verify the workspace and summary tests.
- [x] 4.3 Verify an additional instructor has class access without finalization or signing controls; verify the authorization integration test.

## 5. Finalization, signing, and historical revisions

- [x] 5.1 Extend the finalization snapshot to record every instructor with `isLead`, `isAssistant`, FFN, and level; verify the snapshot integration test.
- [x] 5.2 For new Fire revisions, record the lead's `roster` and `fire` attestations in the finalization action and set the recorded Fire signer to the lead; verify no pending Fire state is created.
- [x] 5.3 Keep the legacy resolver and signing path for revisions whose recorded Fire signer is not the lead; verify existing legacy Fire revision tests still pass.
- [x] 5.4 Update finalization readiness to validate the Fire-qualified lead; verify a Fire class with a non-fire lead cannot finalize and a valid lead can.
- [x] 5.5 Update the certificate and Fire reminder audience rules to the lead for new classes and the recorded signer for legacy pending revisions; verify reminder integration tests.

## 6. Official roster PDFs and instructor supplement

- [x] 6.1 Map KFS-1A Lead fields to the lead and Assisting fields to the assistant, leaving Assisting blank when absent; verify PDF field-inspection tests.
- [x] 6.2 Preserve the legacy KFS mapping when a legacy revision's recorded Fire signer is not the lead; verify legacy PDF fixtures remain reproducible.
- [x] 6.3 Render the Instructor Roster Supplement for revisions with more than two instructors, including name, FFN, level, and role; verify the supplement lists every instructor and omits missing values cleanly.
- [x] 6.4 Append the supplement after KFS-1A pages and before individual training notices; verify the Fire roster PDF page order.
- [x] 6.5 Append the supplement after E16 pages in the KBEMS certificate packet; verify the packet page order and page count.
- [x] 6.6 Make the E16 instructor-name field print lead plus assistant and fit within the field; verify long-name rendering does not overflow.
- [x] 6.7 Add PDF tests for exactly two instructors, more than two, roles, missing FFN/level, and both document families; verify `npm test` passes.

## 7. Completion certificates and email

- [x] 7.1 Include the lead, assistant, and every additional instructor in the certificate email; verify template rendering tests for zero, one, and several additional instructors.
- [x] 7.2 Include every instructor name and role in the certificate content fingerprint so changed team members resend the email; verify the fingerprint tests.
- [x] 7.3 Keep the certificate PDF lead-signed and unchanged in layout; verify certificate fixtures and font tests remain unchanged.

## 8. MTU reporting

- [x] 8.1 Add regression coverage proving the MTU Usage Summary counts the lead, assistant, and all additional instructors in the instructor count and instructor-hours total; verify the report aggregation and PDF tests.
- [x] 8.2 Verify a three-instructor MTU class reports three instructors and three times the class hours without a report-layout change; verify the generated PDF values.

## 9. Integration and release checks

- [x] 9.1 Run `npm run verify` with the integration test database configured; verify every integration test runs rather than being skipped.
- [x] 9.2 Run `CI=1 npm run verify:full`; verify affected browser tests cover team creation, editing, finalization, and roster generation.
  - Verified serially: 232 passed, 216 skipped.
- [x] 9.3 Run `npm run check:migrations -- set` and `npm run db:status`; verify the migration set is consistent and the target ledger says `In sync.`
- [x] 9.4 Verify the dev database has no open Fire class with a non-fire lead after the role correction pass, or record the exceptions and owner.
  - Dev exception: 5 open Fire classes have a non-fire lead and need fixture cleanup. 11 finalized Fire classes have no instructor assignments and are preserved as historical records; reopening them requires a lead. Owner: dev fixture cleanup.
