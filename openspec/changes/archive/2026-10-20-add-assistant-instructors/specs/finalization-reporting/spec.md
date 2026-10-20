## ADDED Requirements

### Requirement: A pending Fire attestation is void on reopen

The system SHALL void a pending Fire attestation when a finalized Fire class is reopened. The superseded revision SHALL retain its recorded facts and any attestation already captured. A later finalization SHALL create a higher-numbered revision that requires a fresh Fire attestation.

#### Scenario: Reopen with a pending Fire signature
- **WHEN** an Administrator reopens a finalized Fire class whose Fire attestation is pending
- **THEN** the pending attestation is void and cannot be added to the superseded revision

#### Scenario: Re-finalize after reopen
- **WHEN** the reopened Fire class is finalized again
- **THEN** the new revision requires a fresh Fire attestation from the resolved Fire signer

## MODIFIED Requirements

### Requirement: Finalization creates an immutable roster revision

The system SHALL allow only the class's lead instructor to finalize an open class, and only after revalidating its roster. The review screen SHALL show finalization readiness before the lead instructor confirms finalization. Finalization SHALL require the lead instructor's certification and typed name and SHALL create a numbered revision containing an immutable snapshot of the class, both assigned instructors, attendance, represented agency, class host agency, credit, and reporting-requirement facts, together with the lead's roster attestation. When Fire is a destination, the revision SHALL record the resolved Fire signer. The Fire attestation SHALL be captured at finalization when the lead is the Fire signer, and otherwise MAY be appended to the revision after it is created by the Fire signer; appending it SHALL NOT alter the snapshot or the revision number. The system SHALL refuse to mark Fire entered until the Fire attestation exists. Authorized official-roster view, print, download, and email actions SHALL use these preserved facts and the relevant attestation without modifying the revision.

#### Scenario: Finalize an open class
- **WHEN** the class's lead instructor finalizes a roster-ready open class from its review screen
- **THEN** the system records an immutable revision with the lead's roster attestation, closes public sign-in, and changes the class state to finalized

#### Scenario: Deny a non-lead finalizer
- **WHEN** a Training Major, Administrator, class creator, an assisting Fire signer, or any other instructor attempts to finalize the class
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

#### Scenario: Record the Fire signer
- **WHEN** a Fire class is finalized
- **THEN** the revision records the resolved Fire signer alongside the lead's roster attestation

#### Scenario: Append the Fire attestation after finalization
- **WHEN** the Fire signer is not the lead and signs the locked revision
- **THEN** the revision gains a Fire attestation without changing its snapshot or revision number

#### Scenario: Block Fire reporting before the Fire signature
- **WHEN** staff attempt to mark Fire entered for a revision whose Fire attestation is pending
- **THEN** the system refuses the change and identifies the pending Fire signature
