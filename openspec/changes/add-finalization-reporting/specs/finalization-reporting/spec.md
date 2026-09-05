## Purpose

Preserve a completed class as immutable historical roster revisions and track each reporting destination independently before official roster files are generated.

## ADDED Requirements

### Requirement: Finalization creates an immutable roster revision
The system SHALL allow an assigned instructor, Training Major, or Administrator to finalize a completed class only after revalidating its roster. Finalization SHALL create a numbered immutable revision containing class, instructor, attendance, agency, credit, attestation, and reporting-requirement snapshot facts.

#### Scenario: Finalize a completed class
- **WHEN** authorized staff finalize a roster-ready completed class
- **THEN** the system records an immutable revision and changes the class state to finalized

#### Scenario: Preserve historical facts
- **WHEN** current class, student, agency, or credential data changes after finalization
- **THEN** the existing finalization revision retains the facts captured at finalization

### Requirement: Reopening retains prior revisions
The system SHALL allow an assigned instructor, Training Major, or Administrator to reopen a finalized class with a non-empty reason. Reopening SHALL retain prior revisions and allow a later finalization to create a higher-numbered revision.

#### Scenario: Reopen for correction
- **WHEN** authorized staff provide a reason to reopen a finalized class
- **THEN** the class becomes editable for correction, the reason and actor are retained, and prior revisions remain unchanged

#### Scenario: Preserve superseded revision
- **WHEN** a reopened class is finalized again
- **THEN** the system creates a new revision without overwriting or deleting the prior revision

### Requirement: Reporting destinations are independent
The system SHALL allow only Training Majors and Administrators to update Fire, KBEMS, and FEMA reporting status independently for each finalization revision. Each destination SHALL retain its current status, reporting actor, server timestamp, reference number, and notes when reported or corrected.

#### Scenario: Record one destination submission
- **WHEN** authorized staff record a Fire reporting submission for a revision
- **THEN** Fire status and submission metadata are updated without changing KBEMS or FEMA status

#### Scenario: Record a correction need
- **WHEN** staff identify a reporting correction for one destination
- **THEN** that destination is marked needs-correction with retained notes while other destinations remain unchanged

### Requirement: Reporting work is queued by status
The system SHALL provide pending and needs-correction queues filtered to finalization revisions and reporting destinations that require staff action.

#### Scenario: View pending reporting
- **WHEN** authorized staff view the pending reporting queue
- **THEN** the system lists finalized revisions with at least one destination awaiting reporting

#### Scenario: View corrections
- **WHEN** authorized staff view the needs-correction queue
- **THEN** the system lists destination-specific correction work with retained notes
