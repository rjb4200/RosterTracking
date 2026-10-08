# mtu-usage-tracking Specification

## Purpose

Record how the grant-funded Mobile Training Unit was used for a class so its equipment, mileage, and supplies consumption can be accounted for and reported later.
## Requirements
### Requirement: MTU usage is recorded for a class
When MTU is a selected destination, the system SHALL store the class's Mobile Training Unit usage as free text for equipment used, mileage, and used supplies.

#### Scenario: Store MTU usage
- **WHEN** staff complete the MTU step with equipment, mileage, and supplies
- **THEN** the system stores those values against the class

#### Scenario: Accept partial MTU usage
- **WHEN** staff provide only mileage
- **THEN** the system stores mileage and leaves equipment and supplies empty without blocking the class

### Requirement: MTU usage is editable at any time
The system SHALL allow authorized staff to change a class's MTU usage at any time, including while the class is open and after it is finalized. The review page SHALL display and edit the current operational MTU usage independently of the class and roster lock. MTU changes SHALL be audited and SHALL NOT alter signed revision facts or official roster PDFs.

#### Scenario: Edit MTU usage while open
- **WHEN** staff change a class's MTU mileage while the class is open
- **THEN** the system saves the new value

#### Scenario: Edit MTU usage after finalization
- **WHEN** staff change a class's MTU usage after the class is finalized
- **THEN** the system saves the new value without requiring the class to be reopened
