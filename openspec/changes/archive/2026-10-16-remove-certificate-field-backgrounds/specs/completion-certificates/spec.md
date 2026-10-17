## ADDED Requirements

### Requirement: Certificate values render on the certificate background
When rendering a completion certificate, the system SHALL clear each certificate text field's `/MK /BG` background before field appearances are regenerated and the form is flattened, so the rendered values sit directly on the certificate page background with no filled field box. The system SHALL leave template field backgrounds unchanged for every other generated PDF.

#### Scenario: Remove the field background
- **WHEN** a completion certificate page is rendered
- **THEN** no certificate text field carries a `/MK /BG` background and the flattened page paints no field-background rectangle

#### Scenario: Keep the rendered values
- **WHEN** a completion certificate is generated with the field backgrounds cleared
- **THEN** every certificate field still shows its mapped value

#### Scenario: Leave other generated PDFs unchanged
- **WHEN** an official roster or individual training notice is generated
- **THEN** its template field backgrounds remain exactly as supplied

### Requirement: Certificate values are centered in their fields
When rendering a completion certificate, the system SHALL center the participant name, class hours, class name, and course number within their respective fields. The participant name SHALL render centered beneath the "Awarded To" label. The system SHALL leave every other certificate field's alignment unchanged.

#### Scenario: Center the participant name
- **WHEN** a completion certificate is generated
- **THEN** the participant name is centered within the student-name field and appears centered beneath the "Awarded To" label

#### Scenario: Center the inline course values
- **WHEN** a completion certificate is generated for a class with hours, a class name, and a course number
- **THEN** the class hours, class name, and course number are each centered within their fields

#### Scenario: Leave other certificate fields alone
- **WHEN** a completion certificate is generated
- **THEN** the completion date and instructor fields keep their existing alignment

### Requirement: Certificate typography uses certificate typefaces
When rendering a completion certificate, the system SHALL render the non-signature fields in Libre Baskerville and the instructor signature in Allura, and SHALL embed both fonts in the generated PDF so the certificate renders consistently regardless of fonts installed on the reader's device. The system SHALL subset the embedded fonts and SHALL leave every other generated PDF in its existing typeface.

#### Scenario: Render the body in Libre Baskerville
- **WHEN** a completion certificate is generated
- **THEN** the participant name, class hours, class name, course number, completion date, and instructor fields are drawn in Libre Baskerville

#### Scenario: Render the signature in Allura
- **WHEN** a completion certificate is generated from a revision with a recorded attestation
- **THEN** the instructor signature is drawn in Allura

#### Scenario: Embed and subset the fonts
- **WHEN** a completion certificate PDF is produced
- **THEN** the Libre Baskerville and Allura fonts are embedded as subset font objects in the PDF rather than referenced from the reader's system

#### Scenario: Preserve other documents' typefaces
- **WHEN** an official roster or individual training notice is generated
- **THEN** it continues to render in its existing typeface
