## MODIFIED Requirements

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
