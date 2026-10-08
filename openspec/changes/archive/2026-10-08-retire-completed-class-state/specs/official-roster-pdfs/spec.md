## MODIFIED Requirements

### Requirement: Official rosters use finalized revision facts
The system SHALL generate KFS-1A and KBEMS-E16 PDFs only from a finalized roster revision. Each form SHALL use the class, instructor, component, participant, agency, credit, and required credential facts preserved by that revision rather than mutable current records. Operational MTU edits SHALL NOT change either roster PDF; the forms SHALL retain their existing approved fields without adding MTU usage.

#### Scenario: Generate a Fire roster
- **WHEN** a Training Major or Administrator generates a KFS-1A roster for a finalized revision
- **THEN** the PDF contains the approved Fire roster fields derived from that revision

#### Scenario: Generate a KBEMS roster
- **WHEN** a Training Major or Administrator generates a KBEMS-E16 roster for a finalized revision
- **THEN** the PDF contains the approved KBEMS roster fields derived from that revision

#### Scenario: Block non-finalized source data
- **WHEN** staff attempt to generate an official roster for a class without a finalized revision
- **THEN** the system rejects the request without returning a roster document

#### Scenario: Preserve roster output after an MTU edit
- **WHEN** a class's MTU usage changes after finalization and its roster is generated again
- **THEN** the roster retains the same revision-based facts and layout without rendering MTU usage
