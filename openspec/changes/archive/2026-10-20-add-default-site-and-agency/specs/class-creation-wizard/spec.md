## ADDED Requirements

### Requirement: New classes preselect the default site and agency

When the class creation wizard opens, the system SHALL preselect the current default training site, the current default host agency, or both. The system SHALL leave a field blank when its default is unset and SHALL NOT substitute a recent or otherwise inferred value. Staff SHALL be able to change either preselected value before creating the class.

#### Scenario: Preselect both defaults
- **WHEN** a default training site and a default host agency are configured and staff open the class creation wizard
- **THEN** the training site and host agency fields start with those defaults selected

#### Scenario: Preselect only the configured default
- **WHEN** only one of the two defaults is configured and staff open the class creation wizard
- **THEN** the configured field starts with its default selected and the other field starts blank

#### Scenario: Preselect nothing when no defaults are configured
- **WHEN** neither default is configured and staff open the class creation wizard
- **THEN** the training site and host agency fields start blank

#### Scenario: Change a preselected default
- **WHEN** staff change a field that was preselected from a default
- **THEN** the changed value is used for the class and the default setting is not modified
