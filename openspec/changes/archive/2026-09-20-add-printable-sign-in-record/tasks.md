## 1. Record derivation

- [x] 1.1 Add a service that builds the class sign-in record from attendance and attestation facts
- [x] 1.2 Include participant, agency, method, credited hours, attestation text, version, and department-time timestamp
- [x] 1.3 Include removed attendance in a retained-history section with actor, reason, and timestamp

## 2. Presentation

- [x] 2.1 Add a print-ready sign-in record view identifying the class, schedule, and host agency
- [x] 2.2 Add a download action for the record
- [x] 2.3 Show originating address and device identifier only on staff output
- [x] 2.4 Paginate large records and repeat class identification per page

## 3. Roster integration

- [x] 3.1 Add an "include sign-in record" checkbox to the roster print action, default off
- [x] 3.2 Add the same option to roster email delivery, default off
- [x] 3.3 Reuse one rendered record for both surfaces

## 4. Finalization

- [x] 4.1 Capture the sign-in record facts in the finalization revision snapshot
- [x] 4.2 Confirm a finalized revision's record does not change after later student edits

## 5. Verification

- [x] 5.1 Integration test: record content matches stored attestation facts for regular and guest attendance
- [x] 5.2 Integration test: removed attendance appears only in the history section
- [x] 5.3 E2E test: print roster with the record option and confirm both are present
- [x] 5.4 Confirm public access to the record is denied
