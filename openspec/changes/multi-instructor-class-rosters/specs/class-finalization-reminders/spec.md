# Spec Delta

## MODIFIED Requirements

### Requirement: The reminder audience is the signing instructor

The system SHALL address an overdue-finalization reminder to the class's lead instructor and a pending-signature reminder to the recorded legacy signer required for that document scope. It SHALL NOT send either reminder to an assistant or additional instructor who is not the responsible signer. New Fire classes use the lead as the Fire signer, so their lead receives the finalization reminder and no separate Fire-signature reminder is created. A legacy Fire class with a pending Fire attestation SHALL remind its recorded Fire signer. When no scope signer is recorded for a legacy Fire class, the system SHALL fall back to the class's lead instructor for the finalization reminder.

#### Scenario: Signing instructor is reminded
- **WHEN** an open class is overdue and has no pending attestation
- **THEN** the class's lead instructor receives the finalization reminder

#### Scenario: Fire signer is reminded to sign
- **WHEN** a legacy finalized class has a pending `fire` attestation
- **THEN** the class's recorded Fire signer receives the signature reminder

#### Scenario: Non-signing instructor is not reminded
- **WHEN** a class has an assistant or additional instructor who is not the responsible signer for a reminder
- **THEN** that instructor does not receive the reminder

#### Scenario: New Fire class has one signer
- **WHEN** a new Fire class is overdue and unfinalized
- **THEN** the lead receives the finalization reminder and no separate Fire-signature reminder exists

#### Scenario: Fall back to the lead
- **WHEN** no scope signer is recorded for an overdue legacy Fire class
- **THEN** the class's lead instructor receives the finalization reminder

### Requirement: Pending attestations are reminded until signed or reopened

The system SHALL include a legacy finalized class whose `fire` attestation is pending in the recorded Fire signer's daily digest until the attestation is recorded or the class is reopened. A new Fire class SHALL NOT enter a pending Fire-attestation state because its lead signs both scopes at finalization. The digest SHALL name the class and identify the Fire signature as the action. A class with no pending required attestation SHALL drop out of later digests. A reopened class SHALL resume reminding only if a scope becomes pending again after a new finalization.

#### Scenario: Remind the Fire signer daily
- **WHEN** a legacy finalized class has a pending `fire` attestation
- **THEN** the next daily run includes it in the recorded Fire signer's digest

#### Scenario: Drop out after signing
- **WHEN** the Fire signer records the `fire` attestation
- **THEN** the class is not included in later signature digests

#### Scenario: Drop out after reopening
- **WHEN** an Administrator reopens the class
- **THEN** the pending signature reminder stops until the class is finalized again

#### Scenario: Do not remind a non-signer
- **WHEN** an assistant or additional instructor is not the Fire signer
- **THEN** the pending Fire signature is not included in that instructor's digest

#### Scenario: Do not create a new pending Fire state
- **WHEN** a new Fire class is finalized
- **THEN** no pending Fire signature reminder is created
