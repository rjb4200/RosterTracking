## 1. Record derivation

- [ ] 1.1 Add a service that builds the class sign-in record from attendance and attestation facts
- [ ] 1.2 Include participant, agency, method, credited hours, attestation text, version, and department-time timestamp
- [ ] 1.3 Include removed attendance in a retained-history section with actor, reason, and timestamp

## 2. Presentation

- [ ] 2.1 Add a print-ready sign-in record view identifying the class, schedule, and host agency
- [ ] 2.2 Add a download action for the record
- [ ] 2.3 Show originating address and device identifier only on staff output
- [ ] 2.4 Paginate large records and repeat class identification per page

## 3. Roster integration

- [ ] 3.1 Add an "include sign-in record" checkbox to the roster print action, default off
- [ ] 3.2 Add the same option to roster email delivery, default off
- [ ] 3.3 Reuse one rendered record for both surfaces

## 4. Finalization

- [ ] 4.1 Capture the sign-in record facts in the finalization revision snapshot
- [ ] 4.2 Confirm a finalized revision's record does not change after later student edits

## 5. Verification

- [ ] 5.1 Integration test: record content matches stored attestation facts for regular and guest attendance
- [ ] 5.2 Integration test: removed attendance appears only in the history section
- [ ] 5.3 E2E test: print roster with the record option and confirm both are present
- [ ] 5.4 Confirm public access to the record is denied
