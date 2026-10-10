## ADDED Requirements

### Requirement: Fire reporting and instructor changes require valid FFNs
When authorized staff add the Fire reporting system to a class, or change its assigned lead or assisting instructors while Fire is selected, the system SHALL require every assigned instructor to have a valid FFN (`0000-0000`) and SHALL reject the change otherwise. This SHALL prevent bypassing the Fire class guard through an edit.

#### Scenario: Reject adding Fire with an instructor lacking a valid FFN
- **WHEN** staff add the Fire reporting system to a class whose lead or assisting instructor has no valid FFN
- **THEN** the system rejects the change and identifies the instructor

#### Scenario: Reject assigning an instructor without a valid FFN to a Fire class
- **WHEN** staff assign an instructor without a valid FFN to a class that has Fire selected
- **THEN** the system rejects the change and identifies the instructor

#### Scenario: Allow the change when every instructor has a valid FFN
- **WHEN** every assigned instructor has a valid FFN
- **THEN** the system saves the Fire reporting or instructor change
