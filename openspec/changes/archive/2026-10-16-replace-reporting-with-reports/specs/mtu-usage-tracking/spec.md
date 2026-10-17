## MODIFIED Requirements

### Requirement: MTU usage is recorded for a class

When MTU is a selected destination, the system SHALL record the class's Mobile Training Unit usage as structured selections from the MTU catalog: equipment and transport as on/off selections, and supplies as selections whose quantities are confirmed at finalization. Each selected transport vehicle SHALL carry its own mileage estimate, and the system SHALL also record free-text equipment, mileage, and supplies values for items that are not in the catalog. Selecting supply, equipment, and transport entries at class creation SHALL NOT require entering supply quantities.

#### Scenario: Store MTU usage
- **WHEN** staff complete the MTU step with selected equipment, supplies, transport, and any free-text extras
- **THEN** the system stores those selections against the class without a supply quantity

#### Scenario: Accept partial MTU usage
- **WHEN** staff record a mileage estimate on a selected transport and leave the equipment and supplies empty
- **THEN** the system stores the mileage and leaves the equipment and supplies empty without blocking the class

#### Scenario: Record mileage per selected vehicle
- **WHEN** staff select two transport vehicles and record a mileage estimate on each
- **THEN** the system stores each vehicle's own mileage estimate against that transport selection

#### Scenario: Record off-catalog usage
- **WHEN** staff type an item that is not in the catalog into a free-text box
- **THEN** the system stores the free text alongside the catalog selections

### Requirement: A driving transport requires a mileage estimate at creation

When a class is created with one or more selected transport entries that require mileage, the system SHALL require a non-empty mileage estimate for each such entry before the class is created. The class-creation wizard SHALL also block advancing past the MTU step while any selected mileage-requiring transport has an empty mileage estimate, SHALL mark that vehicle's mileage field as missing when staff attempt to advance, and SHALL allow advancing once every selected mileage-requiring transport has a non-empty estimate. The requirement SHALL lapse for a vehicle that is deselected, such as when only POV is selected or the driving transport is deselected. The system SHALL NOT enforce the mileage requirement when the class is later edited, finalized, or has its usage changed, and each vehicle's mileage SHALL remain editable and clearable thereafter.

#### Scenario: Require mileage at creation for the van
- **WHEN** staff create a class with the Ford Transit van selected and no mileage estimate
- **THEN** the system rejects the creation and asks for a mileage estimate

#### Scenario: Require mileage for each selected driving vehicle
- **WHEN** staff select the van and the department vehicle, provide a mileage estimate for one, and leave the other empty
- **THEN** the system rejects the creation and asks for the missing vehicle's mileage estimate

#### Scenario: Block advancing past the MTU step without a mileage estimate
- **WHEN** staff select a transport entry that requires mileage and attempt to leave the MTU step with an empty mileage estimate for it
- **THEN** the wizard stays on the MTU step, marks that vehicle's mileage field as missing, and shows the incomplete-step message

#### Scenario: Advance once mileage is provided
- **WHEN** staff select a transport entry that requires mileage, enter a non-empty estimate for it, and attempt to leave the MTU step
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
