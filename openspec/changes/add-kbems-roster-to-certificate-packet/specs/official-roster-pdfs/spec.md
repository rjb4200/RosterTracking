# Spec Delta

## MODIFIED Requirements

### Requirement: Initial official-form scope is limited
The system SHALL support KFS-1A (October 2023), the KFS-1B individual training notice, and the KBEMS-E16 roster as the roster embedded in the KBEMS completion-certificate packet. The KBEMS-E16 SHALL NOT be offered as a standalone official-roster choice. The system SHALL not generate FEMA roster PDFs in this capability.

#### Scenario: Exclude deferred and retired forms
- **WHEN** staff view available standalone official roster types
- **THEN** FEMA and KBEMS-E16 are not offered as standalone generation options

#### Scenario: Include the E16 in the certificate packet
- **WHEN** the system generates the completion-certificate packet for a finalized KBEMS class
- **THEN** the packet includes the KBEMS-E16 roster pages

## ADDED Requirements

### Requirement: KBEMS-E16 prints the class and one-day schedule
The system SHALL populate the KBEMS-E16 Course Name, Instructor Name, Location, Date, Start Time, End Time, Total Hours, and Course Description or Objectives fields from the finalized revision. The date SHALL be the class's roster day, the start time SHALL be the earliest subject start, the end time SHALL be the latest subject end, and total hours SHALL be the sum of subject credited hours.

#### Scenario: Aggregate one subject
- **WHEN** a finalized KBEMS revision has one subject scheduled from 11:00 for 1.5 hours
- **THEN** the E16 shows the roster day, 11:00, 12:30, and 1.5 total hours

#### Scenario: Aggregate sequential subjects
- **WHEN** a finalized KBEMS revision has a 1.5-hour subject starting at 11:00 followed by a 0.5-hour subject
- **THEN** the E16 shows 11:00, 13:00, and 2.0 total hours

#### Scenario: Use finalized facts after a later edit
- **WHEN** the class's course details or subjects change after finalization and the packet is generated again
- **THEN** the E16 keeps the facts preserved by the finalized revision

#### Scenario: Leave a missing optional value blank
- **WHEN** the finalized revision has no course description or objectives
- **THEN** the E16 leaves that field blank rather than printing a placeholder

### Requirement: KBEMS-E16 prints every attendee
The system SHALL print every active attendee of the finalized KBEMS revision on the E16, one row per attendee, showing the attendee's name, KEMSIS ID, and affiliated service. A missing KEMSIS ID SHALL be left blank without omitting the attendee. The E16 SHALL paginate attendees without omission and SHALL print the page number and page count.

#### Scenario: Print all active attendees
- **WHEN** a finalized KBEMS revision has attendees from the host agency and from other agencies
- **THEN** every active attendee appears once on the E16 with that attendee's name, KEMSIS ID, and affiliated service

#### Scenario: Keep an attendee without a KEMSIS ID
- **WHEN** an active attendee has no KEMSIS ID
- **THEN** the attendee's row is printed with the KEMSIS ID field blank

#### Scenario: Paginate an overflow roster
- **WHEN** a finalized KBEMS revision has more attendees than one E16 page supports
- **THEN** the system generates all required E16 pages with each attendee represented once and prints the page number and page count

#### Scenario: Omit removed attendance
- **WHEN** a participant's attendance was removed before finalization
- **THEN** the E16 omits that participant

### Requirement: KBEMS-E16 prints electronic signatures from attestations
The system SHALL print the recorded roster signer's name on the E16 instructor signature line. It SHALL print each active attendee's name on that attendee's signature line only when the finalized revision records a confirmed sign-in attestation. A signature line SHALL remain blank when the corresponding attestation is absent.

#### Scenario: Print the instructor signature
- **WHEN** the finalized revision records a roster signature by "Xavier Quinn"
- **THEN** the E16 instructor signature line shows "Xavier Quinn"

#### Scenario: Print attendee signatures
- **WHEN** an active attendee has a confirmed sign-in attestation in the finalized revision
- **THEN** that attendee's signature line shows the attendee's name

#### Scenario: Leave an unattested attendee blank
- **WHEN** an active attendee has no confirmed sign-in attestation in the finalized revision
- **THEN** that attendee's signature line remains blank

#### Scenario: Keep a legacy signature area blank
- **WHEN** a legacy revision has no roster signature or attendee attestation
- **THEN** the corresponding E16 signature lines remain blank

#### Scenario: Keep signatures aligned across pages
- **WHEN** the E16 paginates attendees across multiple pages
- **THEN** each attendee's signature appears on the same row as that attendee
