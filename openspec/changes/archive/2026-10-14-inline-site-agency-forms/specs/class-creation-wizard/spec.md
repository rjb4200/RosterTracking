## ADDED Requirements

### Requirement: Inline site and agency creation captures details

When staff add a training site or host agency during class setup, the system SHALL present a form that captures the destination's full details rather than only its name. The name SHALL be required and every other field SHALL be optional. On success the system SHALL select the created or reused record without leaving the workflow.

#### Scenario: Add a site with details
- **WHEN** staff add a training site during class setup
- **THEN** the system presents a form for the site's name and address, and on submit selects the site

#### Scenario: Add an agency with details
- **WHEN** staff add a host agency during class setup
- **THEN** the system presents a form for the agency's name, address, contact, training coordinator, and service tags, and on submit selects the agency

#### Scenario: Details are optional
- **WHEN** staff submit the inline site or agency form with only a name
- **THEN** the system creates or reuses the record and selects it
