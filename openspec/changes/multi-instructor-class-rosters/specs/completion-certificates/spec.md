# Spec Delta

## MODIFIED Requirements

### Requirement: The certificate email presents the completion

Each certificate email SHALL address the participant by name, state formally that the named participant has completed the course, and present the course name, the completion date, the class hours, the lead instructor together with the assistant and any additional instructors, and the participant's represented agency. The message SHALL identify that the participant's signed certificate is attached.

#### Scenario: Present the class and instructor facts
- **WHEN** a certificate email is prepared for a participant
- **THEN** it shows the course, the completion date, the class hours, the lead instructor, the assistant when present, and any additional instructors

#### Scenario: Present a class with no assistant
- **WHEN** a certificate email is prepared for a class with a lead and only additional instructors
- **THEN** it lists the lead and the additional instructors without inventing an assistant

#### Scenario: Name the represented agency
- **WHEN** the participant's attendance recorded a represented agency
- **THEN** the message names that agency

#### Scenario: State completion formally
- **WHEN** a certificate email is prepared
- **THEN** the message states that the named participant has completed the course rather than only noting an attachment

#### Scenario: Identify the attachment
- **WHEN** a certificate email is prepared
- **THEN** the message tells the participant their signed certificate is attached

### Requirement: Unchanged certificates are not re-sent

The system SHALL NOT send a participant a certificate email when the certificate and email values that would be produced are unchanged from the participant's last successfully delivered certificate, ignoring the template version. The system SHALL send again when any certificate or email value changes, including the name or role of any assigned instructor.

#### Scenario: Suppress an unchanged resend
- **WHEN** a finalized class is reopened and finalized again and a participant's certificate and email values are unchanged
- **THEN** the system does not send that participant another certificate email

#### Scenario: Send after a change
- **WHEN** a class name, credited hours, course type, course number, completion date, lead instructor, or participant name changes and the class is finalized again
- **THEN** the system sends the affected participant a new certificate email

#### Scenario: Send after an additional instructor changes
- **WHEN** an assistant or additional instructor is added, removed, or renamed on a reopened class and the class is finalized again
- **THEN** the system sends the affected participant a new certificate email
