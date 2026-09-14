## MODIFIED Requirements

### Requirement: Finalization creates an immutable roster revision
The system SHALL allow an assigned instructor, Training Major, or Administrator to finalize a completed class only after revalidating its roster. The completed-class review SHALL show finalization readiness before the operator confirms finalization. Finalization SHALL create a numbered immutable revision containing class, instructor, attendance, agency, credit, attestation, and reporting-requirement snapshot facts. Authorized official-roster view, print, download, and email actions SHALL use these preserved facts without modifying the revision.

#### Scenario: Finalize a completed class
- **WHEN** authorized staff finalize a roster-ready completed class from its review workflow
- **THEN** the system records an immutable revision and changes the class state to finalized

#### Scenario: Block finalization after a review correction
- **WHEN** a completed-class review correction leaves active attendance missing required reporting context or valid credited hours
- **THEN** the system blocks finalization and identifies the roster readiness error

#### Scenario: Preserve historical facts
- **WHEN** current class, student, agency, or credential data changes after finalization
- **THEN** the existing finalization revision retains the facts captured at finalization
