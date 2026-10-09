## MODIFIED Requirements

### Requirement: Student record management
The system SHALL store one primary record per student with a normalized unique phone number, an email address, and an optional unique internal number, and SHALL let authorized staff create, edit, and deactivate students. A student created or confirmed through sign-in going forward SHALL hold an email address; the email is required so the student can receive their completion certificate.

#### Scenario: Create a student
- **WHEN** authorized staff create a student with a first name, last name, phone number, and email
- **THEN** the system stores the student with a server-generated id, normalized phone, and email and records an audit event

#### Scenario: Require an email
- **WHEN** a student is created without an email
- **THEN** the system rejects the create and reports a missing-email error

#### Scenario: Duplicate phone number
- **WHEN** a student is created with a phone number already in use
- **THEN** the system rejects the create and reports a duplicate-phone error

#### Scenario: Deactivate a student
- **WHEN** authorized staff deactivate a student
- **THEN** the student is hidden from active lookups without deleting their historical records
