## ADDED Requirements

### Requirement: A Fire class requires valid instructor FFNs
Before a class with the Fire reporting system is created, the system SHALL require that the assigned lead instructor and every assigned assisting instructor have a correctly formatted FFN (`0000-0000`) on their staff profile. When any required instructor does not, the system SHALL block creation and identify the instructor and the missing or misformatted FFN.

#### Scenario: Block creating a Fire class without a valid lead-instructor FFN
- **WHEN** staff submit a Fire class whose assigned lead instructor has no valid FFN on their profile
- **THEN** the system blocks creation and reports that the lead instructor needs a valid FFN

#### Scenario: Block creating a Fire class without a valid assisting-instructor FFN
- **WHEN** staff submit a Fire class with an assigned assisting instructor who has no valid FFN
- **THEN** the system blocks creation and identifies that instructor

#### Scenario: Allow creating a Fire class with valid instructor FFNs
- **WHEN** every assigned instructor on a Fire class has a valid FFN
- **THEN** the system creates the class
