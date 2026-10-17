## MODIFIED Requirements

### Requirement: Certificate content
Each certificate SHALL show the participant name, the class hours, the course type, the course number, the course-completion date, and the signing instructor's name, and SHALL render the course type and the class name on the signature line, dropping the course type when a long class name does not fit. The certificate SHALL render the signing instructor's typed-name electronic signature derived from the finalization revision's attestation, and SHALL leave the signature blank only when the revision has no recorded attestation. The certificate SHALL leave the instructor signature blank for physical signing only in that no-attestation case.

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
- **WHEN** a certificate is generated from a revision with a recorded attestation
- **THEN** the instructor signature area shows the attested signer's typed name, which is the class's signing instructor

#### Scenario: Leave the signature blank without an attestation
- **WHEN** a certificate is generated from a revision with no recorded attestation
- **THEN** the instructor signature area is left blank
