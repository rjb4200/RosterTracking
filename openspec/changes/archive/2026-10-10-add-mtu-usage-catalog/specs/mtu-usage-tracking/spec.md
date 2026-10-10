## MODIFIED Requirements

### Requirement: MTU usage is recorded for a class

When MTU is a selected destination, the system SHALL record the class's Mobile
Training Unit usage as structured selections from the MTU catalog: equipment as
on/off selections and supplies as quantities. The system SHALL also store
free-text equipment, mileage, and supplies values for items that are not in the
catalog.

#### Scenario: Store MTU usage
- **WHEN** staff complete the MTU step with selected equipment, supply quantities, mileage, and any free-text extras
- **THEN** the system stores those values against the class

#### Scenario: Accept partial MTU usage
- **WHEN** staff provide only mileage
- **THEN** the system stores mileage and leaves the equipment, supplies, and extras empty without blocking the class

#### Scenario: Record off-catalog usage
- **WHEN** staff type an item that is not in the catalog into a free-text box
- **THEN** the system stores the free text alongside the catalog selections

### Requirement: MTU usage is editable at any time

The system SHALL allow instructors assigned to the class and administrators to
change a class's MTU usage at any time, including while the class is open and
after it is finalized. The review page SHALL display and edit the current
operational MTU usage independently of the class and roster lock. MTU changes
SHALL be audited and SHALL NOT alter signed revision facts — the finalized
participant count and revision number — or official roster PDFs.

#### Scenario: Edit MTU usage while open
- **WHEN** an instructor assigned to the class changes its MTU mileage while the class is open
- **THEN** the system saves the new value

#### Scenario: Edit MTU usage after finalization
- **WHEN** an instructor assigned to the class or an administrator changes its MTU usage after the class is finalized
- **THEN** the system saves the new value without requiring the class to be reopened and the finalized participant count and revision number are unchanged

#### Scenario: Deny an unassigned operator
- **WHEN** an operator who is neither assigned to the class nor an administrator attempts to change its MTU usage
- **THEN** the system denies the change

## ADDED Requirements

### Requirement: Expected supply quantities are suggested from the roster

For each selected supply that has a consumption rule, the system SHALL suggest a
quantity equal to the supply's per-class base plus its per-student quantity
multiplied by the number of active participants on the class roster, rounded by
the supply's rounding mode. An operator MAY override a suggested quantity. The
system SHALL recompute non-overridden suggestions as the roster changes until
the class is finalized, and SHALL stop recomputing once the class is finalized.

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
