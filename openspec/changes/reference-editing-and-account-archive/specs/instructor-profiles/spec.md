## MODIFIED Requirements

### Requirement: Instructor profile attributes are stored

The system SHALL store an optional Fire Commission firefighter number (FFN), an optional Fire Instructor certification level, and an optional state EMS provider number for each staff user. The FFN SHALL be stored as digits only, without a dash and without a fixed length. The certification level SHALL be one of 1, 2, or 3 when present.

#### Scenario: Store instructor credential attributes
- **WHEN** an authorized editor saves a Fire Instructor level of 2 for a staff user
- **THEN** the system stores the level and makes it available to official output

#### Scenario: Reject an invalid certification level
- **WHEN** an editor submits a Fire Instructor level other than 1, 2, or 3
- **THEN** the system rejects the value and stores no change

#### Scenario: Accept a missing optional attribute
- **WHEN** a staff user has no EMS provider number recorded
- **THEN** the system leaves that attribute empty without blocking other profile values

#### Scenario: Accept a digits-only firefighter number
- **WHEN** an editor saves a firefighter number of digits without a dash, such as 063446
- **THEN** the system stores it

#### Scenario: Reject a non-digit firefighter number
- **WHEN** an editor saves a firefighter number that contains a non-digit character
- **THEN** the system rejects the value and stores no change
