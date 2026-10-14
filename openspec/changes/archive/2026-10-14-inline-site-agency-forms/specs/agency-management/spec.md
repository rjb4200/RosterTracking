## MODIFIED Requirements

### Requirement: Agency names are unique

The system SHALL keep agency names unique, ignoring letter case and surrounding whitespace. When staff create an agency whose name matches an existing active agency, the system SHALL reuse that agency (selecting it) and SHALL NOT create a second record or change the existing one. When staff rename an agency to a name already used by another agency, the system SHALL reject the rename and report a duplicate-name error.

#### Scenario: Reuse an active agency on create
- **WHEN** staff create an agency whose name matches an existing active agency apart from case or surrounding whitespace
- **THEN** the system reuses the existing agency without creating a duplicate or changing it

#### Scenario: Reject a duplicate agency rename
- **WHEN** staff rename an agency to a name already used by another agency
- **THEN** the system rejects the rename and reports a duplicate-name error
