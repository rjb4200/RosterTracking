# Spec Delta

## MODIFIED Requirements

### Requirement: Training notice content and signature

Each individual training notice SHALL show the participant name and FFN, the lead instructor's name and FFN, each Fire subject's category code and credited hours, the class session date, start time, and location, and the class total hours. The system SHALL render the lead's typed-name electronic signature derived from the revision's Fire attestation. For a legacy revision whose recorded Fire signer is not the lead, the system SHALL render that recorded signer's name and signature. The system SHALL leave the agency-selection field blank. The notice SHALL be generated only when the Fire attestation exists; a new revision SHALL NOT render a blank instructor signature. A legacy revision that predates the Fire attestation SHALL keep the documented blank-signature fallback.

#### Scenario: Populate the notice fields
- **WHEN** an individual training notice is generated from a new revision with a Fire attestation
- **THEN** it shows the participant name and FFN, the lead's name and FFN, the subject category codes and hours, the session date, start time, and location, and the total hours

#### Scenario: Sign from the attestation
- **WHEN** an individual training notice is generated from a new revision with a Fire attestation
- **THEN** the instructor signature area shows the lead's typed name

#### Scenario: Render a legacy signer
- **WHEN** a notice is generated from a legacy revision whose recorded Fire signer is an assistant
- **THEN** the notice shows that recorded signer's name, FFN, and signature

#### Scenario: Do not generate before the Fire signature
- **WHEN** a legacy Fire class is finalized but its Fire attestation is pending
- **THEN** the system does not generate the individual training notice

#### Scenario: Leave the agency selection blank
- **WHEN** an individual training notice is generated
- **THEN** the agency-selection field is left blank

#### Scenario: Keep the legacy blank signature
- **WHEN** a revision predates the Fire attestation and has no recorded signature
- **THEN** the notice keeps the documented blank-signature fallback
