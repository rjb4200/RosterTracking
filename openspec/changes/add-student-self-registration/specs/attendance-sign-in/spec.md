## ADDED Requirements

### Requirement: Self-registration creates the student record at confirmation
The system SHALL create a new regular student, that student's class-required credentials, and their represented-agency membership inside the same attendance transaction that records attendance. The student SHALL be created only after the class state, phone availability, credential availability, agency, class requirements, and attestation all validate. The transaction SHALL retain the same requirement-version and snapshot facts as any other regular attendance, and a retry with the same idempotency key SHALL return the original result without creating a second student.

#### Scenario: Create the student with attendance
- **WHEN** a visitor completes new-student registration and confirms the attestation
- **THEN** the system creates exactly one student, their required credentials, their membership, and one attendance record for the class

#### Scenario: Roll back on a conflict
- **WHEN** the phone number or a credential value becomes unavailable before the transaction commits
- **THEN** the system creates no student, credential, membership, or attendance record

#### Scenario: Retry an uncertain self-registration
- **WHEN** a client retries the same confirmation with the same idempotency key
- **THEN** the system returns the original attendance result without creating a second student
