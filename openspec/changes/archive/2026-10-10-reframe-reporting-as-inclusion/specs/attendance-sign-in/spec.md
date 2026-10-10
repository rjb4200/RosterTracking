## MODIFIED Requirements

### Requirement: Guest attendance remains class-specific
The system SHALL provide a secondary guest workflow that collects the participant name, a valid email address, the attendance agency, and any prompted optional roster fields and credentials without creating or modifying a permanent student record. The email SHALL be required so the guest can receive a completion certificate.

#### Scenario: Sign in a guest
- **WHEN** a visitor cannot use a regular student pathway and completes the guest workflow with a name, email, and agency
- **THEN** the system records a class-specific guest participant and attendance record

#### Scenario: Require a guest email
- **WHEN** a guest submits the guest workflow without an email
- **THEN** the system rejects the confirmation and requests the email

#### Scenario: Do not remember a guest
- **WHEN** guest attendance succeeds
- **THEN** the system does not issue a regular-student remembered-device token or create a reusable student profile

### Requirement: Self-registration creates the student record at confirmation
The system SHALL create a new regular student, that student's captured credentials, and their represented-agency membership inside the same attendance transaction that records attendance. The student SHALL be created only after the class state, phone availability, credential availability, agency, and attestation all validate. The transaction SHALL retain the same inclusion-rule-version and snapshot facts as any other regular attendance, and a retry with the same idempotency key SHALL return the original result without creating a second student.

#### Scenario: Create the student with attendance
- **WHEN** a visitor completes new-student registration and confirms the attestation
- **THEN** the system creates exactly one student, their captured credentials, their membership, and one attendance record for the class

#### Scenario: Roll back on a conflict
- **WHEN** the phone number or a credential value becomes unavailable before the transaction commits
- **THEN** the system creates no student, credential, membership, or attendance record

#### Scenario: Retry an uncertain self-registration
- **WHEN** a client retries the same confirmation with the same idempotency key
- **THEN** the system returns the original attendance result without creating a second student

### Requirement: Reporting context is retained with attendance
The system SHALL retain the effective reporting inclusion-rule versions, every captured student-field value, the credential values supplied at sign-in, and each attendee's resolved reporting inclusion so later profile edits do not change the attendance's reporting facts. Sensitive snapshots SHALL remain protected from public display and plaintext logs.

#### Scenario: Preserve sign-in credentials
- **WHEN** a participant signs in on a class with one or more reporting systems selected
- **THEN** the attendance retains the inclusion-rule versions, the supplied credential and student-field snapshots, and the reporting-inclusion resolution used for that submission
