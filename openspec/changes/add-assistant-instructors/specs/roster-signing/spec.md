## ADDED Requirements

### Requirement: Finalizing requires the signing instructor's attestation
The system SHALL require the class's signing instructor to finalize an open class and SHALL capture, at that moment, an explicit certification action and the signing instructor's typed name. The signing instructor SHALL be the class's fire instructor: the lead instructor when the lead is a fire instructor, and otherwise the assistant instructor when the assistant is a fire instructor. The system SHALL record the signer identity, the server timestamp, and the attestation statement with a version identifier on the created finalization revision.

#### Scenario: Lead instructor signs while finalizing
- **WHEN** the class's lead instructor is a fire instructor and finalizes a roster-ready open class and certifies the roster
- **THEN** the system records the certification, the lead instructor as signer, the server timestamp, and the attestation statement with its version on the new revision

#### Scenario: Assisting fire instructor signs while finalizing
- **WHEN** the class's lead instructor is not a fire instructor and the assistant instructor is, and the assistant finalizes the roster-ready open class and certifies the roster
- **THEN** the system records the certification, the assistant instructor as signer, the server timestamp, and the attestation statement with its version on the new revision

#### Scenario: Refuse to finalize without certification
- **WHEN** the signing instructor submits finalization without the certification
- **THEN** the system refuses to finalize and identifies the missing certification

#### Scenario: Refuse a non-signing finalizer
- **WHEN** a Training Major, Administrator, the class creator, the non-signing lead, or any non-signing instructor attempts to finalize the class
- **THEN** the system denies the finalization

#### Scenario: Capture a fresh signature on each finalization
- **WHEN** a finalized class is reopened and finalized again
- **THEN** the new revision records a fresh attestation, signer, and timestamp, and the prior revision keeps its own

### Requirement: The Fire roster presents the signing instructor's electronic signature
The system SHALL present the signing instructor's electronic signature on the Fire roster as a typed-name line that names the signer, derived from the finalization revision's signing facts rather than the instructor's current profile. It SHALL NOT present an electronic signature for a non-signing instructor.

#### Scenario: Render the signed line
- **WHEN** a Fire roster is generated from a signed revision
- **THEN** the signing instructor's signature area shows a typed-name line naming the signer

#### Scenario: Leave the non-signing instructor signature blank
- **WHEN** a Fire roster is generated
- **THEN** any non-signing instructor's signature area is left blank for physical signing

#### Scenario: Use revision facts
- **WHEN** the signer's name changes after finalization
- **THEN** the existing revision's roster still shows the name captured at finalization

## REMOVED Requirements

### Requirement: Finalizing requires the lead instructor's attestation
**Reason**: Replaced by the signing-instructor requirement, because a class whose lead is not a fire instructor is signed by the assisting fire instructor.
**Migration**: Use "Finalizing requires the signing instructor's attestation".

### Requirement: The Fire roster presents the lead instructor's electronic signature
**Reason**: Replaced by the signing-instructor requirement, because the signer may be the assistant.
**Migration**: Use "The Fire roster presents the signing instructor's electronic signature".
