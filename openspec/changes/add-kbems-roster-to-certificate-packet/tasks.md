# Tasks

## 1. KBEMS-E16 generation

- [x] 1.1 Restore the KBEMS-E16 template mapping with its checksum, 16-row capacity, page-size, and page-number fields; verify the mapping loads and the template's field names match.
- [x] 1.2 Implement the E16 page filler for course name, instructor, location, roster date, earliest start, latest end, total hours, and objectives; verify a unit test asserts the aggregated values.
- [x] 1.3 Implement attendee rows with name, KEMSIS ID, affiliated service, and page numbering; verify tests cover all attendees, a missing KEMSIS ID, removed attendance, and a two-page overflow.

## 2. Packet composition

- [x] 2.1 Prepend the E16 pages to the completion-certificate batch and keep the certificates after them; verify a PDF page-order test.
- [x] 2.2 Move the student-list cover to the end of the batch and paginate it; verify a large-class test lists every participant across pages with no truncation.
- [x] 2.3 Keep individual certificate emails as a single participant certificate only; verify the email-attachment test does not include the roster.

## 3. Signature, access, and final checks

- [x] 3.1 Verify the E16 renders no electronic signature and leaves its physical signature areas blank; verify the signature-boundary test.
- [x] 3.2 Run `npm run check`, `npm run test`, and `npm run build`; verify all pass.
- [x] 3.3 Run the focused completion-certificate and official-roster browser suites; verify they pass.
- [x] 3.4 Run `openspec validate add-kbems-roster-to-certificate-packet --strict`; verify it passes.

## Workflow follow-up

- Archive the change after the review and browser checks pass.
