## ADDED Requirements

### Requirement: The Fire roster requires the Fire signer's attestation

The system SHALL require the class's Fire signer — the fire-eligible lead when eligible, otherwise the fire-eligible assistant — to attest the Fire roster and the individual training notice. When the lead is the Fire signer, finalization SHALL capture the Fire attestation in the same action as the lead's roster certification. When the assistant is the Fire signer, the assistant SHALL attest the locked revision after finalization without reopening the class. The attestation SHALL record the signer's identity, typed name, server timestamp, and attestation statement version on the finalization revision.

#### Scenario: Lead signs Fire at finalization
- **WHEN** the class lead is a fire instructor and finalizes a roster-ready Fire class
- **THEN** the revision records the lead's Fire attestation with the typed name, server timestamp, and statement version

#### Scenario: Assistant signs Fire after finalization
- **WHEN** the class lead is not a fire instructor, the assistant is, and the assistant signs the locked revision
- **THEN** the revision records the assistant's Fire attestation without changing the lead's roster certification

#### Scenario: Refuse a non-Fire signer
- **WHEN** an instructor who is not the class's Fire signer attempts to attest the Fire roster
- **THEN** the system denies the attestation

#### Scenario: Capture a fresh Fire attestation on re-finalization
- **WHEN** a finalized Fire class is reopened and finalized again with a Fire signer
- **THEN** the new revision records a fresh Fire attestation, signer, and timestamp, and the prior revision keeps its own

## MODIFIED Requirements

### Requirement: The Fire roster presents the lead instructor's electronic signature

The system SHALL present the Fire signer's electronic signature on the Fire roster as a typed-name line that names the signer, derived from the revision's Fire attestation rather than the instructor's current profile. The Fire roster SHALL be generated only when the Fire attestation exists. A new revision SHALL NOT render a blank instructor signature. A legacy revision that predates the Fire attestation SHALL keep the documented blank-signature fallback.

#### Scenario: Render the signed line
- **WHEN** a Fire roster is generated from a revision with a Fire attestation
- **THEN** the Fire signer's signature area shows a typed-name line naming the signer

#### Scenario: Do not generate before the Fire signature
- **WHEN** a Fire class is finalized but its Fire attestation is pending
- **THEN** the system does not generate the Fire roster

#### Scenario: Use revision facts
- **WHEN** the Fire signer's name changes after finalization
- **THEN** the existing revision's roster still shows the name captured at finalization

#### Scenario: Leave the assisting signature blank
- **WHEN** a Fire roster is generated
- **THEN** no electronic attestation is rendered for the non-signing instructor

#### Scenario: Legacy revision without a Fire attestation
- **WHEN** a revision predates the Fire attestation and has no recorded signature
- **THEN** the roster keeps the documented blank-signature fallback
