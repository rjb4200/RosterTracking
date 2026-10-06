## ADDED Requirements

### Requirement: The Fire subject curriculum is an either/or choice

The system SHALL present the approved-curricula selection and the not-listed free-text name as a single either/or control, where choosing an approved curriculum clears any typed name and choosing the not-listed option clears any approved selection and reveals the free-text name.

#### Scenario: Choose the not-listed option
- **WHEN** staff choose the not-listed option
- **THEN** a free-text curriculum name field is revealed and any approved selection is cleared

#### Scenario: Choose an approved curriculum
- **WHEN** staff choose an approved curriculum
- **THEN** any typed curriculum name is cleared and the free-text name field is hidden
