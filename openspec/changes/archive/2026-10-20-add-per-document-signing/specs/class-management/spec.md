## MODIFIED Requirements

### Requirement: Class list status is scannable

The system SHALL distinguish every lifecycle state on the class list with a colored indicator and the written state name, SHALL keep each state understandable without relying on color alone, and SHALL show an overdue roster as a separate indicator beside the class status rather than replacing it. It SHALL also show a pending required attestation as a separate indicator beside the class status, naming the pending document scope without replacing the lifecycle state.

#### Scenario: Distinguish lifecycle states
- **WHEN** the class list shows open, finalized, and cancelled classes
- **THEN** each state is visually distinguishable from the others

#### Scenario: Keep status readable without color
- **WHEN** a class status is displayed with a colored indicator
- **THEN** the written lifecycle state remains present

#### Scenario: Flag an overdue roster beside the status
- **WHEN** a class has an overdue roster
- **THEN** the system shows an overdue indicator alongside, not instead of, the lifecycle status

#### Scenario: Flag a pending signature beside the status
- **WHEN** a finalized class has a pending required attestation
- **THEN** the system shows a pending-signature indicator naming the document scope alongside, not instead of, the lifecycle status
