## ADDED Requirements

### Requirement: The signing instructor finalizes and signs from the review screen
The system SHALL present the finalize-and-sign action on the review screen only to the class's signing instructor while the class is open, and SHALL require the certification, the typed name, and — for a class whose destinations include the Mobile Training Unit — the confirmed MTU usage step before finalizing. The signing instructor SHALL be the class's fire instructor: the lead instructor when the lead is a fire instructor, and otherwise the assistant instructor. It SHALL present the finalized revision's recorded signer and signed timestamp to authorized operators. A non-signing operator SHALL still see the review, its documents, and its readiness, but SHALL NOT be offered the finalize-and-sign action.

#### Scenario: Lead instructor finalizes and signs
- **WHEN** the class's lead instructor is a fire instructor and opens the review screen for a roster-ready open class
- **THEN** the screen offers the finalize-and-sign action requiring the certification and typed name

#### Scenario: Assisting instructor finalizes and signs
- **WHEN** the class's lead instructor is not a fire instructor, the assistant instructor is, and the assistant opens the review screen for a roster-ready open class
- **THEN** the screen offers the finalize-and-sign action requiring the certification and typed name

#### Scenario: Withhold the action from non-signing operators
- **WHEN** a Training Major, Administrator, the non-signing lead instructor, or any other non-signing instructor opens the review screen for an open class
- **THEN** the screen presents the review and its documents but does not offer the finalize-and-sign action

#### Scenario: Show the recorded signature
- **WHEN** an authorized operator opens the review screen for a finalized class
- **THEN** the screen presents the recorded signer and signed timestamp for the latest revision

## REMOVED Requirements

### Requirement: The lead instructor finalizes and signs from the review screen
**Reason**: Replaced by the signing-instructor requirement, because the signer is the class's fire instructor and may be the assistant.
**Migration**: Use "The signing instructor finalizes and signs from the review screen".
