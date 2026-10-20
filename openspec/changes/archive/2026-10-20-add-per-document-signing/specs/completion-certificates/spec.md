## MODIFIED Requirements

### Requirement: Certificate content

Each certificate SHALL show the participant name, the class hours, the course type, the course number, the course-completion date, and the instructor name, and SHALL render the course type and the class name on the signature line, dropping the course type when a long class name does not fit. The certificate SHALL render the class lead's typed-name electronic signature derived from the revision's `roster` attestation. The certificate SHALL be generated only when the revision has a `roster` attestation, except for a legacy revision that predates attestations, where the documented blank-signature fallback applies.

#### Scenario: Populate certificate fields
- **WHEN** a certificate is generated
- **THEN** the participant name, class hours, course type, course number, completion date, and signing instructor name are populated

#### Scenario: Omit a missing optional value
- **WHEN** the class has no course number
- **THEN** the certificate leaves that field blank rather than printing a placeholder

#### Scenario: Compose the signature line from the type and class name
- **WHEN** a certificate is generated for a class with a course type and a class name
- **THEN** the signature line shows the course type and the class name

#### Scenario: Drop the type for a long class name
- **WHEN** a class name is too long to fit the signature line together with the course type
- **THEN** the signature line shows only the class name

#### Scenario: Render the electronic signature
- **WHEN** a certificate is generated from a revision with a `roster` attestation
- **THEN** the instructor signature area shows the attesting lead's typed name

#### Scenario: Refuse to generate without a roster attestation
- **WHEN** a new revision has no `roster` attestation
- **THEN** the system does not generate the certificate

#### Scenario: Leave the signature blank without an attestation
- **WHEN** a legacy revision predates attestations and has no recorded signature
- **THEN** the certificate keeps the documented blank-signature fallback
