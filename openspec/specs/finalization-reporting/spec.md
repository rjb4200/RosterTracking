# Finalization Reporting Specification

## Purpose

Preserve a finalized class as immutable historical roster revisions and track each reporting destination independently before official roster files are generated.
## Requirements
### Requirement: Finalization creates an immutable roster revision

The system SHALL allow only the class's lead instructor to finalize an open class, and only after revalidating its roster. The review screen SHALL show finalization readiness before the lead instructor confirms finalization. Finalization SHALL require the lead instructor's certification and typed name and SHALL create a numbered revision containing an immutable snapshot of the class, both assigned instructors, attendance, represented agency, class host agency, credit, and reporting-requirement facts, together with the lead's `roster` attestation. The revision SHALL record the resolved signer for each required document scope. When Fire is a destination, the `fire` attestation SHALL be captured at finalization when the lead is the Fire signer, and otherwise MAY be appended to the revision after it is created by the Fire signer; appending it SHALL NOT alter the snapshot or the revision number. The system SHALL refuse to mark a destination entered until its scope's attestation exists. Authorized official-roster view, print, download, and email actions SHALL use these preserved facts and the relevant scope's attestation without modifying the revision.

#### Scenario: Finalize an open class
- **WHEN** the class's lead instructor finalizes a roster-ready open class from its review screen
- **THEN** the system records an immutable revision with the lead's `roster` attestation, closes public sign-in, and changes the class state to finalized

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
- **THEN** the revision records the resolved `fire` signer alongside the lead's `roster` attestation

#### Scenario: Append the Fire attestation after finalization
- **WHEN** the Fire signer is not the lead and signs the locked revision
- **THEN** the revision gains a `fire` attestation without changing its snapshot or revision number

#### Scenario: Block Fire reporting before the Fire signature
- **WHEN** staff attempt to mark Fire entered for a revision whose `fire` attestation is pending
- **THEN** the system refuses the change and identifies the pending Fire signature

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

### Requirement: Reporting destinations are independent
The system SHALL allow only Training Majors and Administrators to manage Fire, KBEMS, and MTU reporting status independently for each finalization revision. Each destination SHALL have one of `pending`, `entered`, `needs_correction`, or `not_required` as its current status. The system SHALL retain the staff actor, server timestamp, optional external reference number, and optional notes for each status update.

#### Scenario: Record one destination entry
- **WHEN** authorized staff mark Fire entered for a revision
- **THEN** the system records Fire as entered with the authenticated staff user and server timestamp without changing KBEMS or MTU status

#### Scenario: Mark a destination not required
- **WHEN** authorized staff mark a reporting destination not required for a revision
- **THEN** the system excludes that destination from pending reporting work while retaining its status update metadata

#### Scenario: Record a correction need
- **WHEN** staff identify a reporting correction for one destination
- **THEN** that destination is marked needs-correction with retained notes while other destinations remain unchanged

#### Scenario: Preserve migrated reporting progress
- **WHEN** the reporting-status migration runs against an existing reported destination
- **THEN** the system preserves its actor, timestamp, reference number, and notes while representing its status as entered

### Requirement: Fire reporting scope is the valid-FFN subset
The Fire reporting destination SHALL cover only the attendees with a valid FFN. The finalization revision SHALL record each attendee's resolved Fire inclusion so the Fire output and its queue count can be derived without re-evaluating mutable credentials.

#### Scenario: Fire destination counts only valid-FFN attendees
- **WHEN** a finalized class is reported to Fire and some attendees lack a valid FFN
- **THEN** the Fire queue item's included attendee count excludes those attendees

#### Scenario: Revision preserves Fire inclusion
- **WHEN** a class with a mixed roster is finalized
- **THEN** the revision records which attendees are Fire-eligible

### Requirement: A pending Fire attestation is void on reopen

The system SHALL void a pending attestation for any required document scope when a finalized class is reopened. The superseded revision SHALL retain its recorded facts and any attestation already captured. A later finalization SHALL create a higher-numbered revision that requires fresh attestations for every required scope.

#### Scenario: Reopen with a pending Fire signature
- **WHEN** an Administrator reopens a finalized Fire class whose Fire attestation is pending
- **THEN** the pending attestation is void and cannot be added to the superseded revision

#### Scenario: Re-finalize after reopen
- **WHEN** the reopened Fire class is finalized again
- **THEN** the new revision requires fresh attestations for every required scope from the resolved signers

### Requirement: A revision records scope-keyed attestations

The system SHALL allow a finalization revision to carry zero or more attestations keyed by document scope: `roster` and `fire`. The `roster` attestation SHALL be created by the class lead at finalization and SHALL certify the roster. The `fire` attestation SHALL be created by the class's Fire signer — the fire-eligible lead when eligible, otherwise the fire-eligible assistant — at finalization when the lead is the Fire signer, and otherwise after finalization against the locked revision. Each attestation SHALL record its scope, the signer's identity, the signer's typed name, the server timestamp, and the attestation statement version. An attestation SHALL be append-only and SHALL NOT alter the revision's snapshot facts. One signing action MAY create both scopes when the same instructor is required for both.

#### Scenario: Lead attests the roster
- **WHEN** the class lead finalizes a roster-ready open class
- **THEN** the revision records a `roster` attestation naming the lead, the typed name, the timestamp, and the statement version

#### Scenario: Lead attests both scopes
- **WHEN** the class lead is also the class's Fire signer and finalizes the class
- **THEN** the revision records a `roster` attestation and a `fire` attestation with the same signer, typed name, timestamp, and statement version

#### Scenario: Assistant attests fire after finalization
- **WHEN** the class lead is not the Fire signer, the assistant is, and the assistant signs the locked revision
- **THEN** the revision records a separate `fire` attestation naming the assistant without changing the `roster` attestation or the snapshot

#### Scenario: Attestations are immutable
- **WHEN** any attestation exists on a revision
- **THEN** a later action cannot modify or delete it, and a new revision is required to record a different signer

### Requirement: Reporting a destination requires its attestation

The system SHALL refuse to mark a reporting destination as `entered` until the attestation for that destination's scope exists. The Fire destination SHALL require the `fire` attestation. The KBEMS destination SHALL require the `roster` attestation. The MTU destination SHALL require no attestation. The reporting queue SHALL identify a pending attestation as the blocker and SHALL offer the responsible signer the sign action.

#### Scenario: Block Fire entry before the Fire signature
- **WHEN** staff attempt to mark Fire entered for a revision whose `fire` attestation is pending
- **THEN** the system refuses the change and identifies the pending Fire signature

#### Scenario: Allow Fire entry after the Fire signature
- **WHEN** the `fire` attestation exists and staff mark Fire entered
- **THEN** the system records the status change

#### Scenario: Allow KBEMS entry after finalization
- **WHEN** a KBEMS class is finalized and its `roster` attestation exists
- **THEN** staff may mark KBEMS entered

#### Scenario: Leave MTU unblocked
- **WHEN** a class reports to MTU and no Fire or KBEMS attestation is pending for it
- **THEN** the MTU destination is not blocked by attestation

