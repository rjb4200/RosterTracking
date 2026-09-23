## Purpose

Record how the grant-funded Mobile Training Unit was used for a class so its equipment, mileage, and supplies consumption can be accounted for and reported later.

## ADDED Requirements

### Requirement: MTU usage is recorded for a class
When MTU is a selected destination, the system SHALL store the class's Mobile Training Unit usage as free text for equipment used, mileage, and used supplies.

#### Scenario: Store MTU usage
- **WHEN** staff complete the MTU step with equipment, mileage, and supplies
- **THEN** the system stores those values against the class

#### Scenario: Accept partial MTU usage
- **WHEN** staff provide only mileage
- **THEN** the system stores mileage and leaves equipment and supplies empty without blocking the class

### Requirement: MTU usage is editable until finalization
The system SHALL allow authorized staff to change a class's MTU usage while the class is open or completed and SHALL reject the change after the class is finalized.

#### Scenario: Edit MTU usage while open
- **WHEN** staff change a class's MTU mileage while the class is open
- **THEN** the system saves the new value

#### Scenario: Reject MTU usage edit after finalization
- **WHEN** staff attempt to change MTU usage for a finalized class
- **THEN** the system rejects the change

### Requirement: MTU usage is preserved at finalization
Finalizing a class SHALL preserve its MTU usage facts in the immutable revision so a later report can read them.

#### Scenario: Preserve MTU usage in a revision
- **WHEN** a class with MTU usage is finalized
- **THEN** the revision retains the equipment used, mileage, and used supplies captured at finalization

#### Scenario: Retain MTU usage when a class is reopened
- **WHEN** a finalized class is reopened and finalized again
- **THEN** the new revision retains the MTU usage current at the later finalization
