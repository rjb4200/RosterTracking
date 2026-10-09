## MODIFIED Requirements

### Requirement: Messages use typed, branded templates

The system SHALL render each message from a typed, versioned template that produces a branded HTML body, and SHALL render every outbound message inside one shared brand shell consisting of a common header and footer. The header SHALL present the Winchester Fire Department identity — a department-red band carrying the logo, the wordmark "Winchester Fire Department", and the tagline "Serving Winchester & Clark County, KY · Est. 1848" — and the footer SHALL present the department's contact details. Templates SHALL be addressed by a stable identifier and SHALL render the same content for a given set of inputs.

#### Scenario: Render a branded message
- **WHEN** the system prepares a message from a template
- **THEN** the message body is the template's branded HTML rendering for the supplied inputs, wrapped in the shared header and footer

#### Scenario: One shell across messages
- **WHEN** the system sends a certificate email and an official-roster email
- **THEN** both render inside the same shared brand header and footer

## ADDED Requirements

### Requirement: The brand logo is delivered inline

The system SHALL deliver the department logo as an inline image embedded in each outbound message rather than as a remotely hosted image, so it renders without the recipient loading a remote asset and without the application serving a public image URL.

#### Scenario: Logo renders inline
- **WHEN** a message is delivered
- **THEN** the header logo is an inline image carried with the message and referenced by its content identifier

#### Scenario: Message still reads without the image
- **WHEN** an email client does not display the inline image
- **THEN** the header still presents the department wordmark and remains legible
