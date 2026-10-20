## ADDED Requirements

### Requirement: The Fire signer sees the class awaiting their Fire signature

The system SHALL list each finalized Fire class whose Fire attestation is pending on the Fire signer's dashboard and SHALL offer that signer the Sign Fire roster action for it. The system SHALL NOT offer the action to the class lead, a Training Major, an Administrator, or another instructor who is not the Fire signer.

#### Scenario: Assisting Fire signer sees the pending Fire signature
- **WHEN** an assistant who is the class's Fire signer opens their dashboard
- **THEN** the dashboard lists the finalized class and offers the Sign Fire roster action

#### Scenario: Lead sees the pending Fire signature but no action
- **WHEN** the class lead is not the Fire signer and opens their dashboard
- **THEN** the dashboard identifies the pending Fire signature but does not offer the sign action to the lead

#### Scenario: Non-signer is not offered the action
- **WHEN** an assigned instructor who is not the Fire signer views the class on their dashboard
- **THEN** the dashboard does not offer them the Sign Fire roster action
