# Attendance Sign-In Specification

## Purpose

Record regular and guest participation in an open class as a durable, idempotent attendance and attestation transaction that later instructor and finalization workflows can trust.

## Requirements

### Requirement: Regular attendance references the student record
The system SHALL record regular attendance against one active student and one open class. A student SHALL have at most one active attendance record for the same class.

#### Scenario: Sign in a regular student
- **WHEN** an identified student completes the class sign-in workflow
- **THEN** the system records attendance linked to that student and class

#### Scenario: Prevent duplicate regular attendance
- **WHEN** the same student submits attendance for the same class again
- **THEN** the system returns the existing successful attendance result instead of creating a duplicate

### Requirement: Guest attendance remains class-specific
The system SHALL provide a secondary guest workflow that collects the participant name, a valid email address, the attendance agency, and class-required roster fields and credentials without creating or modifying a permanent student record. The email SHALL be required so the guest can receive a completion certificate.

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

### Requirement: Attendance records the represented agency
The system SHALL require one active agency for each attendance. A regular student SHALL default to the class host agency when they belong to it, SHALL otherwise select from their active memberships or from the active agency catalog, and a guest SHALL select any active agency.

#### Scenario: Default to the class host agency
- **WHEN** a regular student belongs to the class host agency
- **THEN** the workflow preselects that agency as the represented agency

#### Scenario: Select from memberships or the catalog
- **WHEN** a regular student does not belong to the class host agency
- **THEN** the workflow offers their active memberships and the active agency catalog and requires one selection

#### Scenario: Guest selects any active agency
- **WHEN** a guest signs in
- **THEN** the workflow offers every active agency in the catalog

#### Scenario: Reject an inactive agency
- **WHEN** a participant submits an inactive agency
- **THEN** the system rejects attendance without creating a record

### Requirement: Attendance includes a class-specific attestation
The system SHALL show the text `I confirm that I am [Student Name] and attended this class.` with the resolved participant name and require the `Confirm & Sign In` action. It SHALL retain the rendered text, text version, server timestamp, sign-in method, originating IP address, and remembered-device identifier when applicable.

#### Scenario: Confirm attendance attestation
- **WHEN** a participant selects `Confirm & Sign In`
- **THEN** the exact rendered attestation and its version are stored with the attendance record

#### Scenario: Do not accept an unconfirmed attestation
- **WHEN** a participant has not performed the confirmation action
- **THEN** the system does not create attendance

### Requirement: Reporting context is retained with attendance
The system SHALL retain the effective reporting requirement-set versions, every required student-field value, and the credential values used for each reporting system at sign-in so later profile edits do not change the attendance's reporting facts. Sensitive snapshots SHALL remain protected from public display and plaintext logs.

#### Scenario: Preserve sign-in credentials
- **WHEN** a participant signs in with credentials required by the class reporting systems
- **THEN** the attendance retains the requirement versions plus protected student-field and credential snapshots used for that submission

### Requirement: Attendance submission is transactional and idempotent
The system SHALL validate class state, identity or guest data, agency, requirements, and attestation and persist all attendance facts in one transaction. Each confirmation SHALL carry an unpredictable server-issued idempotency key bound to the class workflow, participant, and submitted payload. All guest confirmations, including successful submissions, SHALL be subject to per-class and request-source volume limits.

#### Scenario: Retry after an uncertain response
- **WHEN** a client retries the same confirmation with the same idempotency key
- **THEN** the system returns the original result without duplicating attendance, guest data, credentials, or attestation

#### Scenario: Reject changed idempotent payload
- **WHEN** a client reuses an idempotency key with a different participant or confirmation payload
- **THEN** the system rejects the request instead of returning or replacing the prior result

#### Scenario: Class closes before confirmation
- **WHEN** the class leaves the open state before the attendance transaction commits
- **THEN** the transaction creates no attendance data and returns the generic unavailable-class response

#### Scenario: Limit repeated guest confirmations
- **WHEN** a class or request source exceeds the configured guest-confirmation volume threshold
- **THEN** further guest submissions receive a generic temporary-limit response even if their form data is otherwise valid

### Requirement: A student may add the represented agency to their memberships
The system SHALL allow a regular student to add the active agency they represent for a class to their agency memberships, and SHALL persist that membership only when attendance confirmation succeeds.

#### Scenario: Add the represented agency at sign-in
- **WHEN** a regular student represents an active agency that is not already in their memberships and confirms attendance
- **THEN** the system records that membership together with the attendance

#### Scenario: Abandoned sign-in does not change memberships
- **WHEN** a student selects an agency but does not confirm attendance
- **THEN** the system stores no membership change
