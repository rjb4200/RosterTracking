## MODIFIED Requirements

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
