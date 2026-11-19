# Spec Delta

## MODIFIED Requirements

### Requirement: The Fire roster presents the lead instructor's electronic signature

The system SHALL present the lead instructor's electronic signature on the Fire roster as a typed-name line that names the signer, derived from the revision's Fire attestation rather than the instructor's current profile. For a legacy revision whose recorded Fire signer is not the lead, the system SHALL present the recorded signer's signature. The Fire roster SHALL be generated only when the Fire attestation exists. A new revision SHALL NOT render a blank instructor signature. A legacy revision that predates the Fire attestation SHALL keep the documented blank-signature fallback.

#### Scenario: Render the signed line
- **WHEN** a new Fire roster is generated from a revision with a lead Fire attestation
- **THEN** the signature area shows a typed-name line naming the lead

#### Scenario: Render a legacy signer
- **WHEN** a legacy Fire roster is generated from a revision whose recorded Fire signer is an assistant
- **THEN** the signature area shows a typed-name line naming that recorded signer

#### Scenario: Do not generate before the Fire signature
- **WHEN** a legacy Fire class is finalized but its Fire attestation is pending
- **THEN** the system does not generate the Fire roster

#### Scenario: Use revision facts
- **WHEN** the Fire signer's name changes after finalization
- **THEN** the existing revision's roster still shows the name captured at finalization

#### Scenario: Leave the assisting signature blank
- **WHEN** a Fire roster is generated
- **THEN** no electronic attestation is rendered for the assistant or any additional instructor

#### Scenario: Legacy revision without a Fire attestation
- **WHEN** a revision predates the Fire attestation and has no recorded signature
- **THEN** the roster keeps the documented blank-signature fallback

### Requirement: The Fire roster requires the Fire signer's attestation

The system SHALL require the class's lead instructor to attest the Fire roster and the individual training notice. Finalization SHALL capture the Fire attestation in the same action as the lead's roster certification. A legacy revision whose recorded Fire signer is not the lead MAY be attested by that recorded signer after finalization without reopening the class. The attestation SHALL record the signer's identity, typed name, server timestamp, and attestation statement version on the finalization revision.

#### Scenario: Lead signs Fire at finalization
- **WHEN** the class lead finalizes a roster-ready Fire class
- **THEN** the revision records the lead's Fire attestation with the typed name, server timestamp, and statement version

#### Scenario: Assistant signs Fire after finalization
- **WHEN** a legacy revision's lead is not a fire instructor, the recorded assistant is the Fire signer, and the assistant signs the locked revision
- **THEN** the revision records the assistant's Fire attestation without changing the lead's roster certification

#### Scenario: Refuse a non-Fire signer
- **WHEN** an instructor who is not the revision's Fire signer attempts to attest the Fire roster
- **THEN** the system denies the attestation

#### Scenario: Capture a fresh Fire attestation on re-finalization
- **WHEN** a finalized Fire class is reopened and finalized again
- **THEN** the new revision records a fresh lead Fire attestation, and the prior revision keeps its own

### Requirement: Attestations are keyed by document scope

The system SHALL treat each official document family as requiring an attestation from its own scope. The `roster` scope SHALL be satisfied by the class lead's finalization certification and SHALL sign the completion certificate. For a new revision, the `fire` scope SHALL also be satisfied by the class lead at finalization and SHALL sign the KFS-1A and the individual training notice. For a legacy revision, the `fire` scope MAY be satisfied by the recorded Fire signer after finalization. A document family SHALL be generated only when its scope is attested. A new revision SHALL NOT render a blank instructor signature. A legacy revision that predates attestations SHALL keep the documented blank-signature fallback so its output remains reproducible.

#### Scenario: Certificate requires the roster scope
- **WHEN** a KBEMS class is finalized and its `roster` attestation exists
- **THEN** the completion certificate is generated with the lead's typed-name signature

#### Scenario: Fire roster requires the fire scope
- **WHEN** a legacy Fire revision has a pending `fire` attestation
- **THEN** the KFS-1A and individual training notice are not generated

#### Scenario: Fire roster becomes available after signing
- **WHEN** a legacy Fire signer signs the locked revision and the `fire` attestation exists
- **THEN** the KFS-1A and individual training notice are generated with that signer's typed-name signature

#### Scenario: One person covers both scopes
- **WHEN** a new Fire class is finalized
- **THEN** one finalization action satisfies both the `roster` and `fire` scopes for the lead

#### Scenario: Legacy revision without an attestation
- **WHEN** a revision predates scope-keyed attestations and has no recorded signature
- **THEN** its documents keep the documented blank-signature fallback
