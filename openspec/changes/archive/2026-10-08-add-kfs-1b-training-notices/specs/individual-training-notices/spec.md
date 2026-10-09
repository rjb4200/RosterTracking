## Purpose

Produce the per-firefighter KFS-1B individual training notice for a participant who trains at an agency other than the class host agency, from the same immutable revision facts used for the Fire roster, sign it with the instructor's attestation, and deliver it.

## ADDED Requirements

### Requirement: A training notice is produced for participants outside the host agency

For a finalized class that reports to the Fire Commission, the system SHALL produce one KFS-1B individual training notice for each active participant whose represented agency differs from the class host agency, and SHALL NOT produce one for a participant who represents the host agency.

#### Scenario: Produce a notice for an outside firefighter
- **WHEN** a firefighter from another agency attends a finalized Fire class
- **THEN** the system produces an individual training notice for that participant

#### Scenario: Skip a host-agency participant
- **WHEN** a participant's represented agency is the class host agency
- **THEN** no individual training notice is produced for that participant

#### Scenario: Skip a non-Fire class
- **WHEN** a finalized class does not report to the Fire Commission
- **THEN** no individual training notice is produced

### Requirement: Training notice content and signature

Each individual training notice SHALL show the participant name and FFN, the lead instructor's name and FFN, each Fire subject's category code and credited hours, the class session date, start time, and location, and the class total hours. The system SHALL render the lead instructor's typed-name electronic signature derived from the finalization revision's attestation, and SHALL leave the agency-selection field blank.

#### Scenario: Populate the notice fields
- **WHEN** an individual training notice is generated from a revision
- **THEN** it shows the participant name and FFN, the lead instructor name and FFN, the subject category codes and hours, the session date, start time, and location, and the total hours

#### Scenario: Sign from the attestation
- **WHEN** an individual training notice is generated from a revision with a recorded attestation
- **THEN** the instructor signature area shows the attested signer's typed name

#### Scenario: Leave the agency selection blank
- **WHEN** an individual training notice is generated
- **THEN** the agency-selection field is left blank

### Requirement: The white notice is emailed at finalization

When a Fire class is finalized, the system SHALL send each qualifying participant their own White individual training notice as a PDF attachment to the email captured in the finalization revision. Delivery SHALL NOT block or roll back finalization, an unchanged notice SHALL NOT be re-sent, and a failed delivery SHALL be recorded and retryable.

#### Scenario: Email each qualifying participant
- **WHEN** a finalized Fire revision has several participants outside the host agency
- **THEN** the system sends each of them their own White individual training notice

#### Scenario: Finalization survives a delivery failure
- **WHEN** a notice email cannot be delivered
- **THEN** the finalization still succeeds and the failed delivery is recorded

#### Scenario: Suppress an unchanged notice
- **WHEN** a class is reopened and finalized again and a participant's notice is unchanged
- **THEN** the system does not send that participant another notice email

### Requirement: Staff can resend a participant's notice

The system SHALL let authorized staff resend an individual participant's notice, optionally to a different address, and SHALL list qualifying participants without a deliverable email as delivery exceptions with an action to provide an address and send, without changing the stored participant profile.

#### Scenario: Resend to the captured address
- **WHEN** authorized staff resend a participant's notice without entering a different address
- **THEN** the system sends it to the email captured in the finalization revision

#### Scenario: Resend to a different address
- **WHEN** authorized staff resend a participant's notice and supply a different address
- **THEN** the system sends it to that address without altering the stored participant email

#### Scenario: Surface an undeliverable participant
- **WHEN** a qualifying participant has no deliverable email
- **THEN** the review screen lists that participant as a delivery exception

### Requirement: Notice access is controlled

The system SHALL permit only an instructor assigned to the class, a Training Major, or an Administrator to generate, view, or email individual training notices for a finalized revision.

#### Scenario: Permit an assigned instructor
- **WHEN** an instructor assigned to the class requests an individual training notice for a finalized revision
- **THEN** the system permits the request

#### Scenario: Deny an unrelated instructor
- **WHEN** an instructor not assigned to the class requests an individual training notice
- **THEN** the system denies access without disclosing notice content
