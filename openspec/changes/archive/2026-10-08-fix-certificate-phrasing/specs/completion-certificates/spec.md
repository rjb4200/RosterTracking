## MODIFIED Requirements

### Requirement: Certificate content
Each certificate SHALL show the participant name, the class hours, the course type, the course number, the course-completion date, and the instructor name, and SHALL render the course type and the class name on the signature line, dropping the course type when a long class name does not fit. The certificate SHALL render the lead instructor's typed-name electronic signature derived from the finalization revision's attestation, and SHALL leave the signature blank only when the revision has no recorded attestation. The certificate SHALL leave the instructor signature blank for physical signing only in that no-attestation case.

#### Scenario: Populate certificate fields
- **WHEN** a certificate is generated
- **THEN** the participant name, class hours, course type, course number, completion date, and instructor name are populated

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
- **THEN** the instructor signature area shows the attested signer's typed name

#### Scenario: Leave the signature blank without an attestation
- **WHEN** a certificate is generated from a revision with no recorded attestation
- **THEN** the instructor signature area is left blank

## ADDED Requirements

### Requirement: The certificate sentence maps the course facts to its blanks
The system SHALL render the completion sentence as `[first blank] hours [second blank] Course [third blank]`, printing the class hours together with the course type in the first blank, the class name in the second blank, and the course number in the third blank when the class has one. The system SHALL size each rendered value to fit its field so it does not overflow.

#### Scenario: Print the hours and type together
- **WHEN** a certificate is generated for a class with 2 hours and the Continuing Education type
- **THEN** the first blank reads "2 Continuing Education" so the sentence reads "2 Continuing Education hours"

#### Scenario: Print the class name in the second blank
- **WHEN** a certificate is generated for a class named Airway Management
- **THEN** the second blank reads "Airway Management" so the sentence reads "Airway Management Course"

#### Scenario: Print the course number when present
- **WHEN** the class has a course number
- **THEN** the third blank prints it

#### Scenario: Leave the number blank when absent
- **WHEN** the class has no course number
- **THEN** the third blank is left blank

#### Scenario: Fit a long value
- **WHEN** a value is too wide for its field at the default size
- **THEN** the system reduces its rendered size until it fits the field
