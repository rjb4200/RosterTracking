## ADDED Requirements

### Requirement: Initial-certification certificate states program hours

For an initial-certification program class, the certificate SHALL show the program hours as the class hours. The program hours SHALL be the same value used for the class total and participant credit rather than a one-day scheduled duration.

#### Scenario: Issue an EMT-B certificate

- **WHEN** an EMT-B initial-certification class is finalized
- **THEN** the certificate shows 160 hours

#### Scenario: Keep the program hours consistent

- **WHEN** an initial-certification certificate is generated
- **THEN** its class hours match the program hours stored on the revision
