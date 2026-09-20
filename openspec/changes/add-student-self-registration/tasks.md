## 1. Workflow and staging

- [x] 1.1 Add a `new_student` participant to the sign-in workflow state schema
- [x] 1.2 Stage a new student from first name, last name, normalized phone, required fields, required credentials, and an active agency
- [x] 1.3 Require email plus every class-required student field and credential at staging
- [x] 1.4 Keep the pending lookup phone so the registration form prefills it

## 2. Sign-in flow

- [x] 2.1 Send an unknown phone number to the registration step instead of the not-found notice
- [x] 2.2 Add the `new-student-details` page-model step with prefilled phone, required fields, credentials, and agencies
- [x] 2.3 Render the registration screen with one submit plus secondary recovery and guest links
- [x] 2.4 Route a staged new student through the existing review and attestation step
- [x] 2.5 Remember the device by default and rate-limit confirmation by phone

## 3. Attendance transaction

- [x] 3.1 Create the student record, credentials, membership, attendance, and attestation in one transaction
- [x] 3.2 Reject a phone or credential that is already in use with a generic failure
- [x] 3.3 Audit the new student and any credential added at sign-in
- [x] 3.4 Preserve reporting snapshots and idempotency for the new participant kind

## 4. Verification

- [x] 4.1 Unit: page model returns registration for an unknown phone and review for a staged new student
- [x] 4.2 Unit: staging requires email, required fields, required credentials, and an active agency
- [x] 4.3 Integration: confirmation creates the student, credentials, membership, and attendance atomically
- [x] 4.4 Integration: a duplicate phone or credential rolls back without partial records
- [x] 4.5 E2E: an unknown phone registers and signs in on desktop and mobile
- [x] 4.6 Run lint, typecheck, unit tests, integration tests, and build
