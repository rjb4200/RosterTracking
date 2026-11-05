## ADDED Requirements

### Requirement: PDF attachments declare their media type

The system SHALL send every PDF attachment with the `application/pdf` media type, independent of the filename, so recipient mail clients can identify and open it without inferring the type from the attachment name.

#### Scenario: Completion certificate attachment

- **WHEN** a completion certificate email is sent
- **THEN** the outbound PDF attachment declares `application/pdf`

#### Scenario: Individual training notice attachment

- **WHEN** an individual training notice email is sent
- **THEN** the outbound PDF attachment declares `application/pdf`

#### Scenario: Official roster attachment

- **WHEN** an official roster email is sent
- **THEN** the outbound PDF attachment declares `application/pdf`

#### Scenario: Filename does not determine media type

- **WHEN** a PDF attachment is built with a `.pdf` filename
- **THEN** the declared media type is `application/pdf`, not `application/octet-stream`
