## MODIFIED Requirements

### Requirement: A driving transport requires a mileage estimate at creation

When a class is created with a selected transport entry that requires mileage, the system SHALL require a non-empty mileage estimate before the class is created. The class-creation wizard SHALL also block advancing past the MTU step while a selected transport entry requires mileage and the mileage estimate is empty, SHALL mark the mileage field as missing when staff attempt to advance, and SHALL allow advancing as soon as a non-empty estimate is entered. The requirement SHALL lapse when no selected transport entry requires mileage, such as when only POV is selected or the driving transport is deselected. The system SHALL NOT enforce the mileage requirement when the class is later edited, finalized, or has its usage changed, and mileage SHALL remain editable and clearable thereafter.

#### Scenario: Require mileage at creation for the van
- **WHEN** staff create a class with the Ford Transit van selected and no mileage estimate
- **THEN** the system rejects the creation and asks for a mileage estimate

#### Scenario: Block advancing past the MTU step without a mileage estimate
- **WHEN** staff select a transport entry that requires mileage and attempt to leave the MTU step with an empty mileage estimate
- **THEN** the wizard stays on the MTU step, marks the mileage field as missing, and shows the incomplete-step message

#### Scenario: Advance once mileage is provided
- **WHEN** staff select a transport entry that requires mileage, enter a non-empty mileage estimate, and attempt to leave the MTU step
- **THEN** the wizard advances to the next step

#### Scenario: Drop the requirement when the driving transport is deselected
- **WHEN** staff select a transport entry that requires mileage and then deselect it before leaving the MTU step with an empty mileage estimate
- **THEN** the wizard advances without requiring a mileage estimate

#### Scenario: Do not enforce on later edit
- **WHEN** an existing class is edited to select a vehicle that requires mileage with no mileage estimate
- **THEN** the system saves the edit without requiring mileage

#### Scenario: Do not enforce at finalization or after
- **WHEN** a class is finalized or its usage is changed later with no mileage estimate
- **THEN** the system saves without requiring mileage

#### Scenario: Leave POV mileage optional
- **WHEN** staff create a class whose only selected transport is POV and enter no mileage
- **THEN** the class is created without a mileage estimate
