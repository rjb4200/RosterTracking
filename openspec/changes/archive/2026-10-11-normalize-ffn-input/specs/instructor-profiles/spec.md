## MODIFIED Requirements

### Requirement: Instructor profile attributes are stored

The system SHALL store an optional Fire Commission firefighter number (FFN), an optional Fire Instructor certification level, and an optional state EMS provider number for each staff user. The FFN SHALL be stored in the format `0000-0000` — four digits, a hyphen, and four digits. A supplied FFN SHALL be normalized before storage using the same normalization as student credentials: exactly 8 digits, allowing whitespace, hyphen, en dash, em dash, minus sign, or period as separators, rejecting any other character, preserving leading zeros, and rejecting a wrong digit count. The certification level SHALL be one of 1, 2, or 3 when present.

#### Scenario: Store instructor credential attributes
- **WHEN** an authorized editor saves a Fire Instructor level of 2 for a staff user
- **THEN** the system stores the level and makes it available to official output

#### Scenario: Reject an invalid certification level
- **WHEN** an editor submits a Fire Instructor level other than 1, 2, or 3
- **THEN** the system rejects the value and stores no change

#### Scenario: Accept a missing optional attribute
- **WHEN** a staff user has no EMS provider number recorded
- **THEN** the system leaves that attribute empty without blocking other profile values

#### Scenario: Accept a formatted firefighter number
- **WHEN** an editor saves a firefighter number in the `0000-0000` format
- **THEN** the system stores it

#### Scenario: Normalize a supplied firefighter number
- **WHEN** an editor saves a firefighter number as `12345678` or `1234 5678`
- **THEN** the system stores it as `1234-5678`

#### Scenario: Reject a misformatted firefighter number
- **WHEN** an editor saves a firefighter number that neither matches the `0000-0000` format nor normalizes to it
- **THEN** the system rejects the value and stores no change
