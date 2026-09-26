## MODIFIED Requirements

### Requirement: Certificate content
Each certificate SHALL show the participant name, the class hours, the course type, the course number, the course-completion date, and the instructor name, and SHALL render the instructor title and the class name on the signature line. The certificate SHALL leave the instructor signature blank for physical signing.

#### Scenario: Populate certificate fields
- **WHEN** a certificate is generated
- **THEN** the participant name, class hours, course type, course number, completion date, and instructor name are populated

#### Scenario: Omit a missing optional value
- **WHEN** the class has no course number
- **THEN** the certificate leaves that field blank rather than printing a placeholder

#### Scenario: Leave the signature blank
- **WHEN** a certificate is generated
- **THEN** the instructor signature field is blank
