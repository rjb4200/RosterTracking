## ADDED Requirements

### Requirement: The signing instructor sees the class awaiting their signature
The system SHALL list each open class for which the operator is the signing instructor on that operator's dashboard, including when the signing instructor is the class's assistant instructor, and SHALL offer that operator the review-and-finalize action for it.

#### Scenario: Assisting signer sees the awaiting-signature class
- **WHEN** an assistant instructor who is the signing instructor opens their dashboard
- **THEN** the dashboard lists the open class awaiting their signature and offers the review-and-finalize action

#### Scenario: Non-signing instructor is not offered the action
- **WHEN** an assigned instructor who is not the class's signing instructor views the class on their dashboard
- **THEN** the dashboard does not offer them the finalize-and-sign action
