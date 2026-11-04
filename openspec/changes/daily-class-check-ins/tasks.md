# Tasks

## 1. Schema and migration

- [ ] 1.1 Add the daily check-in table with one row per attendance and department-calendar date, including timestamp, sign-in method, attestation text/version, originating IP, and remembered-device fields; verify the uniqueness constraint.
- [ ] 1.2 Add the certificate-disposition storage for inclusion notes and exclusion reasons, including the resolving actor and timestamp; verify existing attendance remains readable.
- [ ] 1.3 Apply the migration to a fresh test database and verify the resulting schema and constraints.

## 2. Sign-in behavior

- [ ] 2.1 On the first initial-certification scan, create the active attendance and the first daily check-in; verify with an integration test.
- [ ] 2.2 On a later date, add a check-in to the existing attendance without creating a second attendance; verify with an integration test.
- [ ] 2.3 On a same-date repeat, return the existing check-in without creating a duplicate; verify with an integration test.
- [ ] 2.4 Keep the existing single-attendance behavior for non-initial classes and verify `already_signed_in` still applies.

## 3. Class sign-in record

- [ ] 3.1 Build the initial-certification sign-in record from daily check-ins grouped by date while retaining the existing entry layout.
- [ ] 3.2 Paginate a date's entries when they do not fit on one page and verify continuation without lost entries.
- [ ] 3.3 Verify a date with no check-ins does not appear and the retained-history behavior still works.

## 4. Review, dispositions, and finalization

- [ ] 4.1 In the review workspace, flag each active student missing one or more class days and verify the count and names.
- [ ] 4.2 Add the Include certificate note and Exclude certificate reason controls, require the matching text, and persist the actor and timestamp.
- [ ] 4.3 Block finalization while any flagged student has no disposition and verify the blocker names the student.
- [ ] 4.4 Keep an excluded student on the roster and transcript with credited hours but skip their certificate; verify the certificate queue and batch.
- [ ] 4.5 Freeze the daily check-ins and dispositions into the finalization revision and verify the finalized record is built from that snapshot.

## 5. Verification

- [ ] 5.1 Run `npm run check`, `npm run test`, and the focused integration tests.
- [ ] 5.2 Run browser coverage for first scan, later-date scan, repeated same-date scan, record pagination, and a blocked finalization that becomes ready after dispositions.
- [ ] 5.3 Run `openspec validate daily-class-check-ins --strict`.

## Workflow follow-up

- Implement this change after `initial-certification-program-hours` lands.
- Archive this change after review and verification pass.
