## MODIFIED Requirements

### Requirement: MTU usage is recorded for a class

When MTU is a selected destination, the system SHALL record the class's Mobile
Training Unit usage as structured selections from the MTU catalog: equipment and
transport as on/off selections, and supplies as selections whose quantities are
confirmed at finalization. The system SHALL also record a mileage estimate and
free-text equipment, mileage, and supplies values for items that are not in the
catalog. Selecting supply, equipment, and transport entries at class creation
SHALL NOT require entering supply quantities.

#### Scenario: Store MTU usage
- **WHEN** staff complete the MTU step with selected equipment, supplies, transport, and any free-text extras
- **THEN** the system stores those selections against the class without a supply quantity

#### Scenario: Accept partial MTU usage
- **WHEN** staff provide only mileage
- **THEN** the system stores mileage and leaves the equipment, supplies, and transport empty without blocking the class

#### Scenario: Record off-catalog usage
- **WHEN** staff type an item that is not in the catalog into a free-text box
- **THEN** the system stores the free text alongside the catalog selections

## ADDED Requirements

### Requirement: A driving transport requires a mileage estimate at creation

When a class is created with a selected transport entry that requires mileage,
the system SHALL require a non-empty mileage estimate before the class is
created. The system SHALL NOT enforce the mileage requirement when the class is
later edited, finalized, or has its usage changed, and mileage SHALL remain
editable and clearable thereafter. A transport entry that does not require
mileage, such as POV, SHALL leave mileage optional.

#### Scenario: Require mileage at creation for the van
- **WHEN** staff create a class with the Ford Transit van selected and no mileage estimate
- **THEN** the system rejects the creation and asks for a mileage estimate

#### Scenario: Do not enforce on later edit
- **WHEN** an existing class is edited to select a vehicle that requires mileage with no mileage estimate
- **THEN** the system saves the edit without requiring mileage

#### Scenario: Do not enforce at finalization or after
- **WHEN** a class is finalized or its usage is changed later with no mileage estimate
- **THEN** the system saves without requiring mileage

#### Scenario: Leave POV mileage optional
- **WHEN** staff create a class whose only selected transport is POV and enter no mileage
- **THEN** the class is created without a mileage estimate
