## ADDED Requirements

### Requirement: Individual certificate PDFs are clean standalone documents

The system SHALL emit each emailed or resent individual certificate as a standalone PDF with one document catalog and no template-level embedded files, so standard mobile PDF viewers can open the certificate reliably.

#### Scenario: Generate an individual certificate

- **WHEN** the system renders a certificate for email or resend
- **THEN** the resulting PDF has one document catalog and no embedded `Content Credentials`/C2PA file

#### Scenario: Preserve certificate content

- **WHEN** the system produces the clean individual certificate
- **THEN** the participant, course, signature, fonts, logo, and page layout match the rendered certificate content

#### Scenario: Keep the admin batch clean

- **WHEN** staff generate the certificate batch
- **THEN** the batch remains a clean document with the student-list cover followed by one certificate page per active participant
