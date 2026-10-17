# mtu-usage-tracking Specification

## Purpose

Record how the grant-funded Mobile Training Unit was used for a class so its equipment, mileage, and supplies consumption can be accounted for and reported later.
## Requirements
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

### Requirement: MTU usage is editable at any time
The system SHALL allow instructors assigned to the class and administrators to change a class's MTU usage at any time, including while the class is open and after it is finalized. The review page SHALL display and edit the current operational MTU usage independently of the class and roster lock. MTU changes SHALL be audited and SHALL NOT alter signed revision facts — the finalized participant count and revision number — or official roster PDFs.

#### Scenario: Edit MTU usage while open
- **WHEN** an instructor assigned to the class changes its MTU mileage while the class is open
- **THEN** the system saves the new value

#### Scenario: Edit MTU usage after finalization
- **WHEN** an instructor assigned to the class or an administrator changes its MTU usage after the class is finalized
- **THEN** the system saves the new value without requiring the class to be reopened and the finalized participant count and revision number are unchanged

#### Scenario: Deny an unassigned operator
- **WHEN** an operator who is neither assigned to the class nor an administrator attempts to change its MTU usage
- **THEN** the system denies the change

### Requirement: Expected supply quantities are suggested from the roster
For each selected supply that has a consumption rule, the system SHALL suggest a quantity equal to the supply's per-class base plus its per-student quantity multiplied by the number of active participants on the class roster, rounded by the supply's rounding mode. An operator MAY override a suggested quantity. The system SHALL recompute non-overridden suggestions as the roster changes until the class is finalized, and SHALL stop recomputing once the class is finalized.

#### Scenario: Suggest a per-student quantity
- **WHEN** a selected supply has a per-student quantity of two and the roster has ten active participants
- **THEN** the system suggests twenty of that supply

#### Scenario: Suggest a per-class quantity
- **WHEN** a selected supply has a per-class base of one and no per-student quantity
- **THEN** the system suggests one regardless of the number of participants

#### Scenario: Override a suggested quantity
- **WHEN** an operator replaces a suggested quantity with a different value
- **THEN** the system stores the operator's value and does not recompute it as the roster changes

#### Scenario: Stop recomputing after finalization
- **WHEN** a class is finalized
- **THEN** the system does not recompute its supply quantities while it remains locked

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
