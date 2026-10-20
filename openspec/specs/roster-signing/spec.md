# Roster Signing Specification

## Purpose

Capture the lead instructor's electronic attestation when a class is finalized and present it — together with each attendee's derived initials — on the printed Fire roster, so a finalized roster carries a named, timestamped record of who verified it.
## Requirements
### Requirement: Finalizing requires the lead instructor's attestation

The system SHALL require the class's lead instructor to finalize an open class and SHALL capture, at that moment, an explicit certification action and the lead instructor's typed name. The system SHALL record the signer identity, the server timestamp, and the attestation statement with a version identifier on the created finalization revision.

#### Scenario: Sign while finalizing
- **WHEN** the class's lead instructor finalizes a roster-ready open class and certifies the roster
- **THEN** the system records the certification, the lead instructor as signer, the server timestamp, and the attestation statement with its version on the new revision

#### Scenario: Refuse to finalize without certification
- **WHEN** the lead instructor submits finalization without the certification
- **THEN** the system refuses to finalize and identifies the missing certification

#### Scenario: Refuse a non-lead finalizer
- **WHEN** a Training Major, Administrator, the class creator, or an assisting instructor attempts to finalize the class
- **THEN** the system denies the finalization

#### Scenario: Capture a fresh signature on each finalization
- **WHEN** a finalized class is reopened and finalized again
- **THEN** the new revision records a fresh attestation, signer, and timestamp, and the prior revision keeps its own

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

### Requirement: The Fire roster prints attendee initials

The system SHALL derive each attendee's initials from the attendee's name as the first letter of the first name followed by the first letter of the last name, uppercased with no separators, and SHALL print them in the Fire roster's attendee initials column. When a name part is unavailable, the system SHALL derive initials from the available part.

#### Scenario: Derive initials from a name
- **WHEN** the Fire roster is generated for an attendee named Ada Lovelace
- **THEN** the attendee's initials cell shows "AL"

#### Scenario: Derive guest initials
- **WHEN** the Fire roster is generated for a guest attendee
- **THEN** the attendee's initials are derived from the guest name

#### Scenario: Handle a missing name part
- **WHEN** an attendee has only one name part
- **THEN** the initials use that part without a placeholder

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

