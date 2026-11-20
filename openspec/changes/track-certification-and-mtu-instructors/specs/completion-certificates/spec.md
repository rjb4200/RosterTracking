# Spec Delta

## MODIFIED Requirements

### Requirement: Certificates are delivered to each participant at finalization
When a finalized EMS class's revision has the internal-certificate flag on, the system SHALL send each active participant their own certificate as a PDF attachment from `noreply@winchesterfireems.com` to the email captured in the finalization revision, and SHALL record each delivery. When the flag is off, the system SHALL NOT send the automatic certificate. Delivery SHALL NOT block or roll back finalization.

#### Scenario: Email each participant
- **WHEN** a finalized EMS revision with the internal-certificate flag on has several active participants
- **THEN** the system sends each participant their own certificate to that participant's captured email

#### Scenario: Do not email a removed participant
- **WHEN** a participant's attendance was removed before finalization
- **THEN** no certificate email is sent to that participant

#### Scenario: Do not email a non-EMS class
- **WHEN** a finalized class did not report to KBEMS
- **THEN** the system does not send certificate emails

#### Scenario: Skip automatic certificates when the flag is off
- **WHEN** a finalized EMS revision has the internal-certificate flag off
- **THEN** the system does not send the automatic certificate batch

#### Scenario: Finalization survives a delivery failure
- **WHEN** a certificate email cannot be delivered
- **THEN** the finalization still succeeds and the failed delivery is recorded

### Requirement: The certificate email presents the completion
Each certificate email SHALL address the participant by name, present the course name, the completion date, the class hours, the lead instructor together with any assisting instructors, and the participant's represented agency, and identify that the participant's certificate is attached. For a document that is not labeled as an hours record, the email SHALL state formally that the named participant has completed the course. For a document labeled as an hours record, the email SHALL state that it records the hours the participant completed and is not the official certification.

#### Scenario: Present the class and instructor facts
- **WHEN** a certificate email is prepared for a participant
- **THEN** it shows the course, the completion date, the class hours, and the lead and assisting instructors

#### Scenario: Name the represented agency
- **WHEN** the participant's attendance recorded a represented agency
- **THEN** the message names that agency

#### Scenario: State completion formally
- **WHEN** a certificate email is prepared for a document that is not an hours record
- **THEN** the message states that the named participant has completed the course rather than only noting an attachment

#### Scenario: Identify the attachment
- **WHEN** a certificate email is prepared
- **THEN** the message tells the participant their signed certificate is attached

#### Scenario: Present an hours record distinctly
- **WHEN** a certificate email is prepared for a document labeled as an hours record
- **THEN** the message states that it records completed hours and is not the official certification

## ADDED Requirements

### Requirement: Internal documents identify an hours record

When the revision has an external certificate issuer or a participant's credited hours are below the class hours, the certificate course title SHALL append `— Hours Completed (Not Official Certification)` and the certificate email subject and heading SHALL identify the document as an hours record. A class with no external issuer and full participant credit SHALL use the ordinary official wording.

#### Scenario: Label an external-certificate class
- **WHEN** a certificate is generated for a revision whose class has an external certificate issuer
- **THEN** the certificate course title appends `— Hours Completed (Not Official Certification)`

#### Scenario: Label a partial-credit participant
- **WHEN** a certificate is generated for a participant whose credited hours are below the class hours
- **THEN** the certificate course title appends `— Hours Completed (Not Official Certification)`

#### Scenario: Leave an internal class unlabeled
- **WHEN** a certificate is generated for a class with no external issuer whose participant is credited the full class hours
- **THEN** the certificate course title does not append the hours-record label

#### Scenario: Mark the email
- **WHEN** a certificate email is prepared for a labeled hours record
- **THEN** its subject and heading identify the attachment as an hours record rather than the official certification

#### Scenario: Send again when the label changes
- **WHEN** a change causes a participant's certificate to become, or stop being, an hours record
- **THEN** the system sends the participant a new certificate email rather than suppressing it as unchanged

### Requirement: A completion notice is sent when external certification is issued without an internal certificate

When a revision has an external certificate issuer and the internal-certificate flag is off, the system SHALL send each active participant with a deliverable email a branded course-completed notice with no attachment that states the course is complete and reminds them to watch for their official certification. Delivery SHALL be recorded and SHALL NOT block or roll back finalization.

#### Scenario: Send the completion notice
- **WHEN** a finalized revision has an external issuer, the internal-certificate flag is off, and an active participant has a deliverable email
- **THEN** the system sends that participant a course-completed notice

#### Scenario: Omit the attachment
- **WHEN** the completion notice is sent
- **THEN** the message carries no certificate or roster attachment

#### Scenario: Exclude removed attendance
- **WHEN** a participant's attendance was removed before finalization
- **THEN** no completion notice is sent to that participant

#### Scenario: Do not notify without an external issuer
- **WHEN** a finalized revision has no external issuer and the internal-certificate flag is off
- **THEN** the system sends no completion notice

#### Scenario: Do not notify when an internal certificate is sent
- **WHEN** a finalized revision has the internal-certificate flag on
- **THEN** the system does not send the completion notice

#### Scenario: Finalization survives a notice failure
- **WHEN** a completion notice cannot be delivered
- **THEN** the finalization still succeeds and the failed delivery is recorded

### Requirement: Individual certificate sending is independent of the class flag

The system SHALL let authorized staff send an internal certificate to an individual active participant of a finalized revision whether the internal-certificate flag is on or off, and SHALL record the delivery and recipient.

#### Scenario: Send when the flag is off
- **WHEN** authorized staff send a certificate to an individual active participant of a finalized revision whose internal-certificate flag is off
- **THEN** the system sends that participant's certificate and records the delivery

#### Scenario: Send when the flag is on
- **WHEN** authorized staff send a certificate to an individual active participant of a finalized revision whose internal-certificate flag is on
- **THEN** the system sends that participant's certificate and records the delivery

#### Scenario: Refuse a removed participant
- **WHEN** authorized staff attempt to send a certificate to attendance removed before finalization
- **THEN** the system does not send a certificate
