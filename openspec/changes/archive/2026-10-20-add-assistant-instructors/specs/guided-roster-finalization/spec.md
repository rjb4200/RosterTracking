## ADDED Requirements

### Requirement: The Fire signer signs the locked Fire roster

When the class lead is not the Fire signer, the system SHALL present the "Sign Fire roster" action to the class's Fire signer after finalization, SHALL keep the roster and class facts read-only while the signer attests, and SHALL make the KFS-1A and individual training notice available only after the Fire attestation exists. The action SHALL require the Fire certification and the signer's typed name. A non-signing operator SHALL see the pending Fire signature status but SHALL NOT be offered the action.

#### Scenario: Assisting Fire signer signs after finalization
- **WHEN** the class lead is not a fire instructor, the assistant is the Fire signer, and the assistant opens the review screen for the finalized class
- **THEN** the screen offers the Sign Fire roster action requiring the Fire certification and typed name

#### Scenario: Keep the roster locked while signing
- **WHEN** the Fire signer signs the locked revision
- **THEN** the system does not offer attendance or class editing

#### Scenario: Withhold the action from non-signers
- **WHEN** the class lead, a Training Major, an Administrator, or another non-signing instructor opens the review screen
- **THEN** the screen shows the pending Fire signature status but does not offer the sign action

#### Scenario: Reveal the Fire documents after signing
- **WHEN** the Fire signer completes the attestation
- **THEN** the KFS-1A and individual training notice become available without reopening the class

## MODIFIED Requirements

### Requirement: The lead instructor finalizes and signs from the review screen

The system SHALL present the finalize action on the review screen only to the class's lead instructor while the class is open, as a compact finalization panel containing the certification, the typed signature, and the finalize action. When the lead is the Fire signer, the panel SHALL also capture the Fire attestation in the same action. When the lead is not the Fire signer, the panel SHALL identify the Fire signer who will sign after finalization. It SHALL require no additional data-entry unless a selected reporting destination requires information that is missing. It SHALL present the finalized revision's recorded roster signer and, when present, the Fire signer and signed timestamp to authorized operators. A non-lead operator SHALL still see the workspace, its roster, and its readiness, but SHALL NOT be offered the finalize action.

#### Scenario: Lead instructor finalizes and signs
- **WHEN** the class's lead instructor opens the review screen for a roster-ready open class
- **THEN** the screen offers the finalize action requiring the certification and typed name

#### Scenario: Lead also signs Fire
- **WHEN** the lead is also the Fire signer and finalizes the class
- **THEN** the finalize action captures both the roster certification and the Fire attestation

#### Scenario: Lead identifies the assisting Fire signer
- **WHEN** the lead is not the Fire signer and finalizes the class
- **THEN** the finalize panel identifies the Fire signer who will sign the Fire roster afterward

#### Scenario: Withhold the action from non-lead operators
- **WHEN** a Training Major, Administrator, or assisting instructor opens the review screen for an open class
- **THEN** the screen presents the workspace and its readiness but does not offer the finalize action

#### Scenario: Show the recorded signature
- **WHEN** an authorized operator opens the review screen for a finalized class
- **THEN** the screen presents the recorded roster signer and, when present, the Fire signer and signed timestamp for the latest revision
