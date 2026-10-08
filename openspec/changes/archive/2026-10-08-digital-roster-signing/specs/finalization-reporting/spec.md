## MODIFIED Requirements

### Requirement: Finalization creates an immutable roster revision

The system SHALL allow only the class's lead instructor to finalize a completed class, and only after revalidating its roster. The completed-class review SHALL show finalization readiness before the lead instructor confirms finalization. Finalization SHALL require the lead instructor's certification and typed name, and SHALL create a numbered immutable revision containing class, instructor, attendance, agency, credit, attestation, signature, and reporting-requirement snapshot facts. Authorized official-roster view, print, download, and email actions SHALL use these preserved facts without modifying the revision.

#### Scenario: Finalize a completed class
- **WHEN** the class's lead instructor finalizes a roster-ready completed class from its review workflow
- **THEN** the system records an immutable revision and changes the class state to finalized

#### Scenario: Deny a non-lead finalizer
- **WHEN** a Training Major, Administrator, class creator, or assisting instructor attempts to finalize the class
- **THEN** the system denies the finalization

#### Scenario: Block finalization after a review correction
- **WHEN** a completed-class review correction leaves active attendance missing required reporting context or valid credited hours
- **THEN** the system blocks finalization and identifies the roster readiness error

#### Scenario: Preserve historical facts
- **WHEN** current class, student, agency, or credential data changes after finalization
- **THEN** the existing finalization revision retains the facts captured at finalization

### Requirement: Reopening retains prior revisions

The system SHALL allow only an Administrator to reopen a finalized class, and only with a non-empty note. Reopening SHALL retain prior revisions and allow a later finalization to create a higher-numbered revision.

#### Scenario: Reopen for correction
- **WHEN** an Administrator provides a note to reopen a finalized class
- **THEN** the class becomes editable for correction, the note and actor are retained, and prior revisions remain unchanged

#### Scenario: Require a reopen note
- **WHEN** an Administrator attempts to reopen a finalized class without a note
- **THEN** the system refuses to reopen the class

#### Scenario: Deny a non-Administrator reopen
- **WHEN** a lead instructor, other instructor, or Training Major attempts to reopen a finalized class
- **THEN** the system denies the reopen

#### Scenario: Preserve superseded revision
- **WHEN** a reopened class is finalized again
- **THEN** the system creates a new revision without overwriting or deleting the prior revision
