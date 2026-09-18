## ADDED Requirements

### Requirement: Classes require a host agency
The system SHALL require every class to reference one active host agency from the agency catalog. The host agency SHALL be selectable during class creation and editing, SHALL be required before a class can be opened for every delivery method including Online, and SHALL be retained with the class for reporting.

#### Scenario: Create a class with a host agency
- **WHEN** authorized staff create a class and select an active host agency
- **THEN** the draft class stores that host agency

#### Scenario: Block opening without a host agency
- **WHEN** staff attempt to open a class with no host agency
- **THEN** the system keeps the class in draft and reports the missing host agency

#### Scenario: Online classes also require a host agency
- **WHEN** staff create an Online class
- **THEN** the system still requires a host agency
