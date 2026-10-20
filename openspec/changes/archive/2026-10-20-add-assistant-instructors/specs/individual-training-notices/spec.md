## MODIFIED Requirements

### Requirement: Training notice content and signature

Each individual training notice SHALL show the participant name and FFN, the Fire signer's name and FFN, each Fire subject's category code and credited hours, the class session date, start time, and location, and the class total hours. The system SHALL render the Fire signer's typed-name electronic signature derived from the revision's Fire attestation, and SHALL leave the agency-selection field blank. The notice SHALL be generated only when the Fire attestation exists; a new revision SHALL NOT render a blank instructor signature. A legacy revision that predates the Fire attestation SHALL keep the documented blank-signature fallback.

#### Scenario: Populate the notice fields
- **WHEN** an individual training notice is generated from a revision with a Fire attestation
- **THEN** it shows the participant name and FFN, the Fire signer's name and FFN, the subject category codes and hours, the session date, start time, and location, and the total hours

#### Scenario: Sign from the attestation
- **WHEN** an individual training notice is generated from a revision with a Fire attestation
- **THEN** the instructor signature area shows the Fire signer's typed name

#### Scenario: Do not generate before the Fire signature
- **WHEN** a Fire class is finalized but its Fire attestation is pending
- **THEN** the system does not generate the individual training notice

#### Scenario: Leave the agency selection blank
- **WHEN** an individual training notice is generated
- **THEN** the agency-selection field is left blank

#### Scenario: Keep the legacy blank signature
- **WHEN** a revision predates the Fire attestation and has no recorded signature
- **THEN** the notice keeps the documented blank-signature fallback
