## MODIFIED Requirements

### Requirement: Finalization creates an immutable roster revision
The system SHALL allow an assigned instructor, Training Major, or Administrator to finalize a completed class only after revalidating its roster. Finalization SHALL create a numbered immutable revision containing class, instructor, attendance, agency, credit, attestation, and reporting-requirement snapshot facts. Authorized official-roster generation SHALL use these preserved facts and retain separate artifact-generation records without modifying the revision.

#### Scenario: Finalize a completed class
- **WHEN** authorized staff finalize a roster-ready completed class
- **THEN** the system records an immutable revision and changes the class state to finalized

#### Scenario: Preserve historical facts
- **WHEN** current class, student, agency, or credential data changes after finalization
- **THEN** the existing finalization revision retains the facts captured at finalization
