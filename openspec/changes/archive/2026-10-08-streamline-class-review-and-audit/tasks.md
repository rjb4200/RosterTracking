## 1. Audit log dedupe

- [x] 1.1 Add `actorUserId` to the `getClassAuditLog` row selection so generation events can be keyed by actor
- [x] 1.2 Collapse `official_roster.generated` to one entry per `(revisionId, actorUserId, formType)`, keeping the earliest
- [x] 1.3 Collapse `completion_certificate.generated` to one entry per `(revisionId, actorUserId)`, keeping the earliest
- [x] 1.4 Keep `official_roster.email.sent` entries per send
- [x] 1.5 Update class-audit-log unit and integration tests for the collapsed output

## 2. Unified Documents list

- [x] 2.1 Render the sign-in record, audit log, KFS-1A roster, KBEMS-E16 roster, and completion certificates as peer rows in one `member-list`
- [x] 2.2 Show the completion-certificates row only when the latest revision's destinations include KBEMS
- [x] 2.3 Keep older-revision outputs reachable from the revision history section

## 3. Progressive email action

- [x] 3.1 Collapse each roster row to `[View] [Email]`; reveal the recipient field plus `[Send] [Cancel]` only when Email is chosen
- [x] 3.2 Submit on Send and collapse on success with a confirmation line
- [x] 3.3 Remove the always-visible recipient input and the separate confirm step

## 4. Reopen section

- [x] 4.1 Split finalize and reopen so the top Finalization section keeps the finalize form and the finalized note
- [x] 4.2 Add a bottom "Reopen roster" `admin-section` rendered only when the viewer may reopen
- [x] 4.3 Remove the reopen control from the top section

## 5. Verification

- [x] 5.1 Run `npm run check`, `npm run test`, and `npm run test:integration`
- [x] 5.2 Manually verify a finalized class review: one documents list, progressive email, no certificates row without KBEMS, and reopen only at the bottom for admins
- [x] 5.3 Manually verify the audit log shows one generation row per actor per revision per form, and one per actor per revision for certificates
