# Spec Delta

## MODIFIED Requirements

### Requirement: Finalization creates an immutable roster revision

The system SHALL allow only the class's lead instructor to finalize an open class, and only after revalidating its roster. The review screen SHALL show finalization readiness before the lead instructor confirms finalization. Finalization SHALL require the lead instructor's certification and typed name and SHALL create a numbered revision containing an immutable snapshot of the class, all assigned instructors and their roles, attendance, represented agency, class host agency, credit, and reporting-requirement facts, together with the lead's `roster` attestation. When Fire is a destination, finalization SHALL also capture the lead's `fire` attestation because the lead is the Fire signer. For a legacy revision whose recorded Fire signer is not the lead, the `fire` attestation MAY be appended after the revision is created without altering the snapshot or revision number. The system SHALL refuse to mark a destination entered until its scope's attestation exists. Authorized official-roster view, print, download, and email actions SHALL use these preserved facts and the relevant scope's attestation without modifying the revision.

#### Scenario: Finalize an open class
- **WHEN** the class's lead instructor finalizes a roster-ready open class from its review screen
- **THEN** the system records an immutable revision with the lead's `roster` attestation, closes public sign-in, and changes the class state to finalized

#### Scenario: Deny a non-lead finalizer
- **WHEN** a Training Major, Administrator, class creator, assistant, additional instructor, or any other instructor attempts to finalize the class
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

#### Scenario: Snapshot all assigned instructors
- **WHEN** a class with a lead, an assistant, and additional instructors is finalized
- **THEN** the revision records every instructor's name, role, FFN, and certification level as captured at finalization

#### Scenario: Record the Fire signer
- **WHEN** a new Fire class is finalized
- **THEN** the revision records the lead as the `fire` signer alongside the lead's `roster` attestation

#### Scenario: Append the Fire attestation after finalization
- **WHEN** a legacy revision's recorded Fire signer is not the lead and signs the locked revision
- **THEN** the revision gains a `fire` attestation without changing its snapshot or revision number

#### Scenario: Block Fire reporting before the Fire signature
- **WHEN** staff attempt to mark Fire entered for a legacy revision whose `fire` attestation is pending
- **THEN** the system refuses the change and identifies the pending Fire signature

### Requirement: A revision records scope-keyed attestations

The system SHALL allow a finalization revision to carry zero or more attestations keyed by document scope: `roster` and `fire`. The `roster` attestation SHALL be created by the class lead at finalization and SHALL certify the roster. For a new revision, the `fire` attestation SHALL also be created by the class lead at finalization, because the lead is the Fire signer. For a legacy revision, the `fire` attestation MAY be created by the revision's recorded Fire signer after finalization. Each attestation SHALL record its scope, the signer's identity, the signer's typed name, the server timestamp, and the attestation statement version. An attestation SHALL be append-only and SHALL NOT alter the revision's snapshot facts. One signing action MAY create both scopes when the same instructor is required for both.

#### Scenario: Lead attests the roster
- **WHEN** the class lead finalizes a roster-ready open class
- **THEN** the revision records a `roster` attestation naming the lead, the typed name, the timestamp, and the statement version

#### Scenario: Lead attests both scopes
- **WHEN** the class lead finalizes a Fire class
- **THEN** the revision records a `roster` attestation and a `fire` attestation with the same signer, typed name, timestamp, and statement version

#### Scenario: Assistant attests fire after finalization
- **WHEN** a legacy revision's lead is not the Fire signer, the recorded assistant is, and the assistant signs the locked revision
- **THEN** the revision records a separate `fire` attestation naming the assistant without changing the `roster` attestation or the snapshot

#### Scenario: Attestations are immutable
- **WHEN** any attestation exists on a revision
- **THEN** a later action cannot modify or delete it, and a new revision is required to record a different signer
