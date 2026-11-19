# Spec Delta

## ADDED Requirements

### Requirement: The instructor editor presents the three instructor roles

While a class is open, the review workspace's instructor editor SHALL present the lead instructor, at most one assistant instructor, and any number of additional instructors as distinct controls. It SHALL prevent one person from occupying more than one role, SHALL show which two instructors are the official roster pair, and SHALL identify the assistant as the second instructor of record.

#### Scenario: Show the three roles
- **WHEN** an operator opens the instructor editor for an open class
- **THEN** the editor presents the lead, the optional assistant, and the additional instructors separately

#### Scenario: Add an additional instructor
- **WHEN** an operator adds an active staff member who is neither the lead nor the assistant
- **THEN** the editor records that person as an additional instructor

#### Scenario: Prevent overlapping roles
- **WHEN** an operator chooses the lead, assistant, or an additional instructor for an incompatible role
- **THEN** the editor rejects the selection and keeps each person in one role

## MODIFIED Requirements

### Requirement: The lead instructor finalizes and signs from the review screen

The system SHALL present the finalize action on the review screen only to the class's lead instructor while the class is open, as a compact finalization panel containing the certification, the typed signature, and the finalize action. When Fire is selected, the panel SHALL capture the Fire attestation in the same action because the lead is the Fire signer; it SHALL NOT identify or wait for a separate Fire signer. For a legacy revision whose Fire attestation is pending, the panel SHALL continue to identify the recorded legacy Fire signer. It SHALL require no additional data-entry unless a selected reporting destination requires information that is missing. It SHALL present the finalized revision's recorded roster signer and, when present, the Fire signer and signed timestamp to authorized operators. A non-lead operator SHALL still see the workspace, its roster, and its readiness, but SHALL NOT be offered the finalize action.

#### Scenario: Lead instructor finalizes and signs
- **WHEN** the class's lead instructor opens the review screen for a roster-ready open class
- **THEN** the screen offers the finalize action requiring the certification and typed name

#### Scenario: Lead also signs Fire
- **WHEN** a Fire class's lead finalizes the class
- **THEN** the finalize action captures both the roster certification and the Fire attestation

#### Scenario: Do not identify a separate Fire signer
- **WHEN** a Fire class is finalized from the current model
- **THEN** the finalize panel names the lead as the only document signer

#### Scenario: Lead identifies the assisting Fire signer
- **WHEN** a legacy Fire revision's recorded Fire signer is not the lead and its Fire attestation is pending
- **THEN** the panel identifies the recorded Fire signer who will sign the Fire roster afterward

#### Scenario: Withhold the action from non-lead operators
- **WHEN** a Training Major, Administrator, assistant, or additional instructor opens the review screen for an open class
- **THEN** the screen presents the workspace and its readiness but does not offer the finalize action

#### Scenario: Show the recorded signature
- **WHEN** an authorized operator opens the review screen for a finalized class
- **THEN** the screen presents the recorded roster signer and, when present, the Fire signer and signed timestamp for the latest revision

### Requirement: The Fire signer signs the locked Fire roster

For a legacy revision whose Fire attestation is pending and whose recorded Fire signer is not the lead, the system SHALL present the "Sign Fire roster" action to that recorded signer after finalization, SHALL keep the roster and class facts read-only while the signer attests, and SHALL make the KFS-1A and individual training notice available only after the Fire attestation exists. The action SHALL require the Fire certification and the signer's typed name. A new revision created under the lead-as-Fire-signer model SHALL NOT enter this pending state. A non-signing operator SHALL see a pending legacy Fire signature status but SHALL NOT be offered the action.

#### Scenario: Assisting Fire signer signs after finalization
- **WHEN** a legacy class lead is not a fire instructor, the recorded assistant is the Fire signer, and the assistant opens the review screen for the finalized class
- **THEN** the screen offers the Sign Fire roster action requiring the Fire certification and typed name

#### Scenario: Keep the roster locked while signing
- **WHEN** the Fire signer signs the locked legacy revision
- **THEN** the system does not offer attendance or class editing

#### Scenario: Withhold the action from non-signers
- **WHEN** the class lead, a Training Major, an Administrator, or another non-signing instructor opens the review screen for a legacy pending revision
- **THEN** the screen shows the pending Fire signature status but does not offer the sign action

#### Scenario: Reveal the Fire documents after signing
- **WHEN** the Fire signer completes the legacy attestation
- **THEN** the KFS-1A and individual training notice become available without reopening the class

### Requirement: Per-scope attestation status on the review screen

The review screen SHALL present each required attestation scope separately, naming the signed scope, the signer, and the signed timestamp when it is complete, or naming the responsible signer when it is pending. A new Fire revision SHALL record both the `roster` and `fire` scopes at finalization by the lead and SHALL NOT present a pending Fire scope. A legacy revision MAY present a pending Fire scope to its recorded signer. When the operator is a pending scope's signer, the screen SHALL offer the sign action for that scope. The sign action SHALL NOT reopen the class, SHALL NOT offer attendance or class editing, and SHALL refresh the scope's status and document availability after it completes. The screen SHALL present a document family's view, print, download, and email actions only when that family's scope is attested, except for the legacy blank-signature fallback. The revision history SHALL show each revision's scopes and their signers.

#### Scenario: Show a signed scope
- **WHEN** an authorized operator opens the review screen for a finalized class
- **THEN** the screen names each completed scope, its signer, and its signed timestamp

#### Scenario: Show a new Fire revision as fully signed
- **WHEN** a new Fire revision is finalized
- **THEN** the screen shows both the `roster` and `fire` scopes signed by the lead

#### Scenario: Show a pending scope to its signer
- **WHEN** a legacy Fire signer opens the review screen for a finalized class whose `fire` scope is pending
- **THEN** the screen names that Fire signer as the pending signer and offers the Fire sign action

#### Scenario: Hide the sign action from other operators
- **WHEN** an operator who is not the pending scope's signer opens the review screen
- **THEN** the screen shows the pending status but does not offer that scope's sign action

#### Scenario: Reveal documents after attestation
- **WHEN** a scope becomes attested
- **THEN** its document view, print, download, and email actions become available without a page reload losing the operator's place

#### Scenario: Show per-scope history
- **WHEN** a class has more than one finalization revision
- **THEN** the revision history shows each revision's scopes, signers, and signed timestamps
