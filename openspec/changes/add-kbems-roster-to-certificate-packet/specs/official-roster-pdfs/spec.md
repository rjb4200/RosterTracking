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

### Requirement: KBEMS-E16 leaves physical signature areas blank
The KBEMS-E16 template has no electronic signature fields. The system SHALL NOT render an electronic signature on the E16 and SHALL leave its instructor and attendee signature areas blank for physical signing.

#### Scenario: Do not render an electronic signature
- **WHEN** the E16 is generated for a revision with a roster attestation
- **THEN** no electronic signature or typed signer name is written into a signature area

#### Scenario: Leave attendee signature lines blank
- **WHEN** the E16 is generated
- **THEN** every attendee signature area remains blank for physical signing

#### Scenario: Keep the legacy blank signature
- **WHEN** a legacy revision predates attestations and has no recorded signature
- **THEN** the E16 still leaves its signature areas blank
