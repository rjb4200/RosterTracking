## Purpose

Preserve and present the class-scoped attestation evidence for each attendance so an authorized instructor can print or deliver a legally meaningful sign-in record with the roster.

## ADDED Requirements

### Requirement: Sign-in record derives from attendance and attestation facts
The system SHALL produce a class sign-in record from the stored attendance and attestation facts rather than from free entries, showing for each attendance the participant name, participant type, represented agency, sign-in method, credited hours, and, when present, the rendered attestation text, its text version, the confirmed server timestamp in department time, and the remembered-device identifier.

#### Scenario: Record a regular sign-in
- **WHEN** a regular student's attendance is confirmed
- **THEN** the sign-in record lists the student with the exact attestation text, its version, and the confirmation timestamp

#### Scenario: Record a guest sign-in
- **WHEN** a guest's attendance is confirmed
- **THEN** the sign-in record lists the guest with their attestation facts and the guest participant name

### Requirement: Sign-in record includes removed attendance
The system SHALL include attendance that has been removed in a retained-history section, with the removal actor, reason, and timestamp, and SHALL NOT present removed attendance as active.

#### Scenario: Removed attendance appears as history
- **WHEN** an attendance record has been removed
- **THEN** the sign-in record shows it separately with its removal details

### Requirement: Sign-in record is printable and downloadable
The system SHALL present the sign-in record as a print-ready staff view and SHALL allow an authorized instructor to print or download it. The printed record SHALL identify the class, its schedule, and its host agency.

#### Scenario: Print the sign-in record
- **WHEN** an authorized instructor opens the sign-in record for a class and chooses print
- **THEN** the system presents a print layout containing the class identification and each attendance entry

### Requirement: Roster outputs can include the sign-in record
The system SHALL offer a sign-in-record option on roster print and roster email actions so the record can be included with the roster when desired, and SHALL NOT include it when the option is not selected.

#### Scenario: Include the record with a roster email
- **WHEN** an authorized instructor sends a roster email with the sign-in record option selected
- **THEN** the delivery includes both the roster and the sign-in record

#### Scenario: Omit the record by default
- **WHEN** an authorized instructor prints or emails a roster without selecting the sign-in record option
- **THEN** the delivery includes only the roster

### Requirement: Sign-in record is retained with finalization
The system SHALL capture the class sign-in record with the immutable finalization revision so later profile, agency, or credential edits cannot change the retained record.

#### Scenario: Finalize with the record
- **WHEN** a class is finalized
- **THEN** the finalization snapshot retains the sign-in record facts as they existed at finalization

### Requirement: Sign-in record access is controlled
The system SHALL restrict the sign-in record to authorized staff and SHALL show the originating address and device identifier only on staff output.

#### Scenario: Public visitors cannot access the record
- **WHEN** a public visitor requests the sign-in record
- **THEN** the system denies access
