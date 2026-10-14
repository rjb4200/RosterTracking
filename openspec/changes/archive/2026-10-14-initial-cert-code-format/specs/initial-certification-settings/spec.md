## ADDED Requirements

### Requirement: Initial-certification TEI number is a single global setting

The system SHALL hold one global TEI number that prefixes initial-certification course numbers, defaulting to `126` when unset. The system SHALL let only an administrator change the TEI number, and SHALL offer the editing control as a subdued field on the Reporting page.

#### Scenario: Default TEI number
- **WHEN** no administrator has set a TEI number
- **THEN** the system uses `126` as the initial-certification prefix

#### Scenario: Administrator changes the TEI number
- **WHEN** an administrator saves a new TEI number on the Reporting page
- **THEN** the system uses the new value as the expected prefix for initial-certification course numbers

#### Scenario: A non-administrator cannot change the TEI number
- **WHEN** a staff member who is not an administrator views the Reporting page
- **THEN** the TEI editing control is not offered and a save is refused
