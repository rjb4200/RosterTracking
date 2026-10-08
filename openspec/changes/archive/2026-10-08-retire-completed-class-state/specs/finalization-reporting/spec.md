## MODIFIED Requirements

### Requirement: Finalization creates an immutable roster revision
The system SHALL allow only the class's lead instructor to finalize an open class, and only after revalidating its roster. The review screen SHALL show finalization readiness before the lead instructor confirms finalization. Finalization SHALL require the lead instructor's certification and typed name, and SHALL create a numbered immutable revision containing class, instructor, attendance, agency, credit, attestation, signature, and reporting-requirement snapshot facts. Authorized official-roster view, print, download, and email actions SHALL use these preserved facts without modifying the revision.

#### Scenario: Finalize an open class
- **WHEN** the class's lead instructor finalizes a roster-ready open class from its review screen
- **THEN** the system records an immutable revision, closes public sign-in, and changes the class state to finalized

#### Scenario: Deny a non-lead finalizer
- **WHEN** a Training Major, Administrator, class creator, or assisting instructor attempts to finalize the class
- **THEN** the system denies the finalization

#### Scenario: Block finalization after a review correction
- **WHEN** a review correction leaves active attendance missing required reporting context or valid credited hours
- **THEN** the system keeps the class open and identifies the roster readiness error

#### Scenario: Preserve historical facts
- **WHEN** current class, student, agency, or credential data changes after finalization
- **THEN** the existing finalization revision retains the facts captured at finalization
