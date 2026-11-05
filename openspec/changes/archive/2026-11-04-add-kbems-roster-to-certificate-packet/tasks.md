# Tasks

## 1. KBEMS-E16 generation

- [x] 1.1 Restore the KBEMS-E16 template mapping with its checksum, 16-row capacity, page-size, and page-number fields; verify the mapping loads and the template's field names match.
- [x] 1.2 Implement the E16 page filler for course name, instructor, location, roster date, earliest start, latest end, total hours, and objectives; verify a unit test asserts the aggregated values.
- [x] 1.3 Implement attendee rows with name, KEMSIS ID, affiliated service, and page numbering; verify tests cover all attendees, a missing KEMSIS ID, removed attendance, and a two-page overflow.
- [x] 1.4 Preserve each attendee's confirmed sign-in attestation timestamp in the finalized snapshot; verify finalization tests cover confirmed, manual, and legacy attendance.
- [x] 1.5 Draw the instructor's roster signer name and each attested attendee name on the E16 signature lines using the bundled signature font; verify E16 tests cover the instructor, attested attendees, unattested rows, and paginated row alignment.

## 2. Packet composition

- [x] 2.1 Prepend the E16 pages to the completion-certificate batch and keep the certificates after them; verify a PDF page-order test.
- [x] 2.2 Move the student-list cover to the end of the batch and paginate it; verify a large-class test lists every participant across pages with no truncation.
- [x] 2.3 Keep individual certificate emails as a single participant certificate only; verify the email-attachment test does not include the roster.
- [x] 2.4 Verify a generated KBEMS packet contains signed E16 pages followed by the certificates and the cover; verify the packet integration test.

## 3. Signature, access, and final checks

- [x] 3.1 Verify the E16 signature boundary end to end: names print only from recorded roster or attendance attestations, manual and legacy rows stay blank, and individual certificate emails contain only the participant certificate with no roster or attendee signatures; verify the signature-boundary tests.
- [x] 3.2 Run `npm run check`, `npm run test`, and `npm run build`; verify all pass.
- [x] 3.3 Run the focused completion-certificate and official-roster browser suites; verify they pass.
- [x] 3.4 Run `openspec validate add-kbems-roster-to-certificate-packet --strict`; verify it passes.

## Workflow follow-up

- Archive the change after the review and browser checks pass.
