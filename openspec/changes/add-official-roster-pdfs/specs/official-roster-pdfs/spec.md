## Purpose

Generate printable KFS-1A and KBEMS-E16 roster PDFs on demand from immutable finalization revisions.

## ADDED Requirements

### Requirement: Official rosters use finalized revision facts
The system SHALL generate KFS-1A and KBEMS-E16 PDFs only from a finalized roster revision. Each form SHALL use the class, instructor, component, participant, agency, credit, and required credential facts preserved by that revision rather than mutable current records.

#### Scenario: Generate a Fire roster
- **WHEN** a Training Major or Administrator generates a KFS-1A roster for a finalized revision
- **THEN** the PDF contains the approved Fire roster fields derived from that revision

#### Scenario: Generate a KBEMS roster
- **WHEN** a Training Major or Administrator generates a KBEMS-E16 roster for a finalized revision
- **THEN** the PDF contains the approved KBEMS roster fields derived from that revision

#### Scenario: Block non-finalized source data
- **WHEN** staff attempt to generate an official roster for a class without a finalized revision
- **THEN** the system rejects the request without creating an artifact

### Requirement: Form fields preserve official-signature boundaries
The system SHALL populate only approved non-signature and non-initial fields from finalization facts. The PDF SHALL leave KFS-1A attendee and instructor initials/signature fields and KBEMS-E16 student and instructor signature fields blank for the required physical signing process.

#### Scenario: Leave signature fields blank
- **WHEN** the system generates an official roster PDF
- **THEN** no electronic attestation is rendered as a student or instructor signature or initial

### Requirement: Multi-page rosters retain form context
The system SHALL paginate attendees without omitting any finalized attendee and SHALL repeat the form context and page count required for each generated form.

#### Scenario: Generate an overflow roster
- **WHEN** a finalized revision contains more attendees than one form page supports
- **THEN** the system generates all required pages with each attendee represented once

### Requirement: Official rosters are generated on demand
The system SHALL generate each official roster PDF from the selected finalized revision and return it directly to the authorized requester. The system SHALL not retain generated PDF bytes, object-storage records, or artifact metadata after the request completes.

#### Scenario: Download an on-demand roster
- **WHEN** authorized staff request an official roster for a finalized revision
- **THEN** the system returns a newly generated PDF derived from that revision

#### Scenario: Regenerate a roster
- **WHEN** authorized staff request the same official roster again
- **THEN** the system generates another PDF from the same preserved revision without retaining either generated copy

### Requirement: Official roster access is controlled
The system SHALL allow only Training Majors and Administrators to generate and download official rosters for finalized revisions.

#### Scenario: Prevent unauthorized artifact access
- **WHEN** a user without roster authority requests generation or download
- **THEN** the system denies access without disclosing generated roster content

### Requirement: Initial official-form scope is limited
The system SHALL support KFS-1A (October 2023) and KBEMS-E16 (September 2012) only. The system SHALL not generate KFS-1B individual Training Notices or FEMA roster PDFs in this capability.

#### Scenario: Exclude deferred forms
- **WHEN** staff view available official roster types
- **THEN** KFS-1B and FEMA are not offered as generation options
