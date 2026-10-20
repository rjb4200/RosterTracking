## ADDED Requirements

### Requirement: Pending attestations are reminded until signed or reopened

The system SHALL include a finalized class whose `fire` attestation is pending in the Fire signer's daily digest until the attestation is recorded or the class is reopened. The digest SHALL name the class and identify the Fire signature as the action. A class with no pending required attestation SHALL drop out of later digests. A reopened class SHALL resume reminding only if a scope becomes pending again after a new finalization.

#### Scenario: Remind the Fire signer daily
- **WHEN** a finalized class has a pending `fire` attestation
- **THEN** the next daily run includes it in the Fire signer's digest

#### Scenario: Drop out after signing
- **WHEN** the Fire signer records the `fire` attestation
- **THEN** the class is not included in later signature digests

#### Scenario: Drop out after reopening
- **WHEN** an Administrator reopens the class
- **THEN** the pending signature reminder stops until the class is finalized again

#### Scenario: Do not remind a non-signer
- **WHEN** an assigned instructor is not the Fire signer
- **THEN** the pending Fire signature is not included in that instructor's digest

## MODIFIED Requirements

### Requirement: The reminder audience is the signing instructor

The system SHALL address an overdue-finalization reminder to the class's lead instructor and a pending-signature reminder to the signer required for that document scope, and SHALL NOT send either reminder to an assigned instructor who is not the responsible signer. When no scope signer resolves for a Fire class, the system SHALL fall back to the class's lead instructor for the finalization reminder.

#### Scenario: Signing instructor is reminded
- **WHEN** an open class is overdue and has no pending attestation
- **THEN** the class's lead instructor receives the finalization reminder

#### Scenario: Fire signer is reminded to sign
- **WHEN** a finalized class has a pending `fire` attestation
- **THEN** the class's Fire signer receives the signature reminder

#### Scenario: Non-signing instructor is not reminded
- **WHEN** a class has an assigned instructor who is not the responsible signer for a reminder
- **THEN** that instructor does not receive the reminder

#### Scenario: Fall back to the lead
- **WHEN** no scope signer resolves for an overdue Fire class
- **THEN** the class's lead instructor receives the finalization reminder
