## ADDED Requirements

### Requirement: A notice can be generated and emailed for any participant on demand

For a finalized Fire class, the system SHALL let authorized staff view a participant's individual training notice inline and email it, in a chosen Yellow or White variant, to an operator-entered address. The participant SHALL be any active participant of the revision, including one whose represented agency is the class host agency. Each on-demand send SHALL update that participant's notice delivery record so it appears in delivery state, and SHALL record an audit event with the actor, the revision, the participant, the variant, and the plaintext recipient.

#### Scenario: View a participant's notice inline
- **WHEN** authorized staff choose to view a participant's training notice
- **THEN** the system renders the notice from the revision and opens it inline

#### Scenario: Email a notice in a chosen variant
- **WHEN** authorized staff email a participant's notice and choose the Yellow or White variant
- **THEN** the system emails the chosen variant as a PDF attachment to the entered address

#### Scenario: Email to a custom address
- **WHEN** authorized staff email a participant's notice to an address they entered
- **THEN** the system sends it to that address without changing the stored participant email

#### Scenario: Include a host-agency participant
- **WHEN** an authorized operator emails a notice for a participant who represents the class host agency
- **THEN** the system generates and sends the notice for that participant

#### Scenario: Record the delivery and audit
- **WHEN** an on-demand notice is emailed
- **THEN** the participant's delivery record reflects the send and an audit event records the actor, participant, variant, and plaintext recipient
