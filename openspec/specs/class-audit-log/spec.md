# Class Audit Log Specification

## Purpose

Provide a detailed, printable audit trail for a class so authorized staff can see who changed the class, its attendance, its finalization, and its official outputs, and can keep that trail as a record for Fire Commission and KBEMS reporting.

## Requirements

### Requirement: Class audit log is class-scoped and detailed

The system SHALL produce a class audit log from the append-only audit records associated with the class. The log SHALL include class lifecycle changes, attendance additions, removals, credit adjustments, and public sign-ins, finalization and reopen actions, and reporting and official-output generation events. The system SHALL order entries chronologically and SHALL identify each entry by its department timestamp, actor, action, and affected entity.

#### Scenario: Include class lifecycle changes
- **WHEN** an authorized user views the audit log for a class that has been created, edited, scheduled, assigned, opened, completed, and finalized
- **THEN** every recorded class lifecycle change appears with its actor and timestamp

#### Scenario: Include attendance changes
- **WHEN** attendance for the class was manually added, removed, or credit-adjusted
- **THEN** each of those events appears in the class audit log

#### Scenario: Include public sign-ins
- **WHEN** a participant signed in to the class through the public sign-in flow
- **THEN** the sign-in event appears in the class audit log

#### Scenario: Include reporting and output events
- **WHEN** an official roster was generated or emailed, a completion certificate was generated, or a reporting destination status was updated for the class
- **THEN** those events appear in the class audit log

#### Scenario: Order chronologically
- **WHEN** the class audit log is produced
- **THEN** entries are ordered from earliest to latest

### Requirement: Sign-in audit events are class-scoped

The system SHALL record the class id on every audit event written during public student sign-in that changes a student record, so the event can be included in that class's audit log.

#### Scenario: Record the class on profile completion
- **WHEN** a public sign-in completes a student's profile
- **THEN** the audit event records the class id

#### Scenario: Record the class on credential addition
- **WHEN** a public sign-in adds a student credential
- **THEN** the audit event records the class id

#### Scenario: Record the class on membership addition
- **WHEN** a public sign-in adds a student membership
- **THEN** the audit event records the class id

### Requirement: Class audit log is presented as a printable PDF

The system SHALL present the class audit log as a PDF that identifies the class and includes each audit entry. The system SHALL allow an authorized user to view the PDF inline and to print or download it through the browser. The PDF SHALL group entries by phase and SHALL render each supported action as a human-readable description.

#### Scenario: View and print the audit log
- **WHEN** an authorized user chooses View for the class audit log
- **THEN** the system presents the rendered PDF inline and allows the browser print and download workflow

#### Scenario: Render human-readable actions
- **WHEN** the audit log contains a recognized action
- **THEN** the entry renders a human-readable description rather than a raw action code

#### Scenario: Render an unrecognized action
- **WHEN** the audit log contains an action the renderer does not recognize
- **THEN** the entry still renders without failing the document

#### Scenario: Reject an inaccessible class
- **WHEN** the class does not exist or is not accessible to the requester
- **THEN** the system returns not found without disclosing class or audit content

### Requirement: Class audit log access is controlled

The system SHALL restrict the class audit log to authorized staff and SHALL apply the same access rule as the class roster: an assigned instructor may view the audit log only for a class they are assigned to, and Training Majors and Administrators may view it for any class.

#### Scenario: Permit an assigned instructor
- **WHEN** an assigned instructor requests the audit log for their class
- **THEN** the system permits the request

#### Scenario: Deny an unrelated instructor
- **WHEN** an instructor requests the audit log for a class they are not assigned to
- **THEN** the system denies access without disclosing audit content

#### Scenario: Permit elevated staff
- **WHEN** a Training Major or Administrator requests the audit log for any class
- **THEN** the system permits the request

### Requirement: Class audit log excludes protected values

The class audit log SHALL NOT display values the audit system excludes from storage, including passwords, tokens, secrets, raw phone numbers, and full credential values.

#### Scenario: Omit protected values
- **WHEN** the class audit log is rendered
- **THEN** no password, token, secret, raw phone number, or full credential value appears in the document
