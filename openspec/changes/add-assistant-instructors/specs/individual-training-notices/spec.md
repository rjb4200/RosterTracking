## MODIFIED Requirements

### Requirement: Training notice content and signature

Each individual training notice SHALL show the participant name and FFN, the signing instructor's name and FFN, each Fire subject's category code and credited hours, the class session date, start time, and location, and the class total hours. The system SHALL render the signing instructor's typed-name electronic signature derived from the finalization revision's attestation, and SHALL leave the agency-selection field blank.

#### Scenario: Populate the notice fields
- **WHEN** an individual training notice is generated from a revision
- **THEN** it shows the participant name and FFN, the signing instructor name and FFN, the subject category codes and hours, the session date, start time, and location, and the total hours

#### Scenario: Sign from the attestation
- **WHEN** an individual training notice is generated from a revision with a recorded attestation
- **THEN** the instructor signature area shows the attested signer's typed name, which is the class's signing instructor

#### Scenario: Leave the agency selection blank
- **WHEN** an individual training notice is generated
- **THEN** the agency-selection field is left blank
