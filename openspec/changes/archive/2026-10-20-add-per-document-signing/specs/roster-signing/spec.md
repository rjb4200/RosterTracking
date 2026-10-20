## ADDED Requirements

### Requirement: Attestations are keyed by document scope

The system SHALL treat each official document family as requiring an attestation from its own scope. The `roster` scope SHALL be satisfied by the class lead's finalization certification and SHALL sign the completion certificate. The `fire` scope SHALL be satisfied by the class's Fire signer — the fire-eligible lead when eligible, otherwise the fire-eligible assistant — and SHALL sign the KFS-1A and the individual training notice. A document family SHALL be generated only when its scope is attested. A new revision SHALL NOT render a blank instructor signature. A legacy revision that predates attestations SHALL keep the documented blank-signature fallback so its output remains reproducible.

#### Scenario: Certificate requires the roster scope
- **WHEN** a KBEMS class is finalized and its `roster` attestation exists
- **THEN** the completion certificate is generated with the lead's typed-name signature

#### Scenario: Fire roster requires the fire scope
- **WHEN** a Fire class is finalized but its `fire` attestation is still pending
- **THEN** the KFS-1A and individual training notice are not generated

#### Scenario: Fire roster becomes available after signing
- **WHEN** the Fire signer signs the locked revision and the `fire` attestation exists
- **THEN** the KFS-1A and individual training notice are generated with the Fire signer's typed-name signature

#### Scenario: One person covers both scopes
- **WHEN** the class lead is also the Fire signer
- **THEN** one finalization action satisfies both the `roster` and `fire` scopes

#### Scenario: Legacy revision without an attestation
- **WHEN** a revision predates scope-keyed attestations and has no recorded signature
- **THEN** its documents keep the documented blank-signature fallback
