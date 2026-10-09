## MODIFIED Requirements

### Requirement: Official rosters use finalized revision facts
The system SHALL generate the KFS-1A PDF only from a finalized roster revision. The form SHALL use the class, instructor, component, participant, agency, credit, and required credential facts preserved by that revision rather than mutable current records. Operational MTU edits SHALL NOT change the roster PDF; the form SHALL retain its existing approved fields without adding MTU usage.

#### Scenario: Generate a Fire roster
- **WHEN** a Training Major or Administrator generates a KFS-1A roster for a finalized revision
- **THEN** the PDF contains the approved Fire roster fields derived from that revision

#### Scenario: Block non-finalized source data
- **WHEN** staff attempt to generate an official roster for a class without a finalized revision
- **THEN** the system rejects the request without returning a roster document

#### Scenario: Preserve roster output after an MTU edit
- **WHEN** a class's MTU usage changes after finalization and its roster is generated again
- **THEN** the roster retains the same revision-based facts and layout without rendering MTU usage

### Requirement: Form fields preserve official-signature boundaries
The system SHALL populate the KFS-1A lead-instructor signature area and each attendee's initials cell from the finalization revision's signing facts, and SHALL leave the KFS-1A assisting-instructor signature blank for the required physical signing process. It SHALL populate only approved fields otherwise.

#### Scenario: Populate the Fire signature and initials
- **WHEN** the system generates a KFS-1A roster for a signed revision
- **THEN** the lead-instructor signature area shows the electronic signature and each attendee row shows the attendee's derived initials

#### Scenario: Leave the assisting signature blank
- **WHEN** the system generates a KFS-1A roster
- **THEN** no electronic attestation is rendered for the assisting instructor

### Requirement: Initial official-form scope is limited
The system SHALL support KFS-1A (October 2023) only. The KBEMS-E16 form SHALL NOT be offered as an output. The system SHALL not generate KFS-1B individual Training Notices or FEMA roster PDFs in this capability.

#### Scenario: Exclude deferred and retired forms
- **WHEN** staff view available official roster types
- **THEN** KFS-1B, FEMA, and KBEMS-E16 are not offered as generation options

### Requirement: KFS-1A subject cells wrap long values

The system SHALL render each KFS-1A subject row's Class Name, Curriculum, and Lesson Plan value across up to two lines within its cell when the value does not fit on one line at a legible size. For those values the system SHALL use the largest text size that fits within the cell across the available lines rather than shrinking the value onto a single line. Values that fit on one line at a legible size SHALL render unchanged. This SHALL apply only to the KFS-1A subject rows.

#### Scenario: Wrap a long curriculum label
- **WHEN** a finalized subject's Curriculum value is longer than one line at a legible size
- **THEN** the generated KFS-1A renders the value across up to two lines within the Curriculum cell at a larger size than a single auto-shrunk line would use

#### Scenario: Wrap a long class name or lesson plan
- **WHEN** a finalized subject's Class Name or Lesson Plan value is longer than one line at a legible size
- **THEN** the generated KFS-1A renders that value across up to two lines within its cell

#### Scenario: Keep a short value on one line
- **WHEN** a finalized subject's Class Name, Curriculum, or Lesson Plan value fits on one line at a legible size
- **THEN** the generated KFS-1A renders it on a single line as before

#### Scenario: Leave other documents unchanged
- **WHEN** the system generates a completion certificate
- **THEN** its layout and field rendering are unaffected by this behavior
