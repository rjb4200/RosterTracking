## MODIFIED Requirements

### Requirement: Finalization creates an immutable roster revision
The system SHALL allow only the class's signing instructor to finalize an open class, and only after revalidating its roster. The signing instructor SHALL be the class's fire instructor — the lead instructor when the lead is a fire instructor, and otherwise the assistant instructor when the assistant is a fire instructor. The review screen SHALL show finalization readiness before the signing instructor confirms finalization. Finalization SHALL require the signing instructor's certification and typed name, and SHALL create a numbered immutable revision containing class, instructor, attendance, represented agency, class host agency, credit, attestation, signature, and reporting-requirement snapshot facts. Authorized official-roster view, print, download, and email actions SHALL use these preserved facts without modifying the revision.

#### Scenario: Finalize an open class
- **WHEN** the class's signing instructor finalizes a roster-ready open class from its review screen
- **THEN** the system records an immutable revision, closes public sign-in, and changes the class state to finalized

#### Scenario: Deny a non-signing finalizer
- **WHEN** a Training Major, Administrator, class creator, the non-signing instructor, or any other instructor attempts to finalize the class
- **THEN** the system denies the finalization

#### Scenario: Block finalization after a review correction
- **WHEN** a review correction leaves active attendance missing required reporting context or valid credited hours
- **THEN** the system keeps the class open and identifies the roster readiness error

#### Scenario: Preserve historical facts
- **WHEN** current class, student, agency, or credential data changes after finalization
- **THEN** the existing finalization revision retains the facts captured at finalization

#### Scenario: Retain the host and represented agencies
- **WHEN** a class is finalized
- **THEN** the revision retains the class host agency and each attendee's represented agency so an outside-agency participant can be identified from the revision alone
