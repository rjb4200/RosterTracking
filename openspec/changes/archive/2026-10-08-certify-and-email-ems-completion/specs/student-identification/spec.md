## ADDED Requirements

### Requirement: A regular student supplies an email before confirming attendance
The system SHALL require an identified regular student who lacks an email address to provide a valid email before attendance confirmation, treating it the same as a missing class-required field. The workflow SHALL request only the missing email and SHALL NOT overwrite an existing stored email.

#### Scenario: Prompt for a missing email
- **WHEN** an identified regular student has no email on their record
- **THEN** the workflow requests an email before allowing attendance confirmation

#### Scenario: Accept a supplied email
- **WHEN** a regular student supplies a valid email during the workflow
- **THEN** the system retains the email with the attendance and does not require it again for that class

#### Scenario: Reject an invalid email
- **WHEN** a regular student supplies an invalid email
- **THEN** the workflow reports the error and does not allow confirmation

#### Scenario: Do not overwrite an existing email
- **WHEN** a regular student already has an email
- **THEN** the workflow does not request or replace it
