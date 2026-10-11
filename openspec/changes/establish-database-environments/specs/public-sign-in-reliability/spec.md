## MODIFIED Requirements

### Requirement: Same-origin validation accepts the served hosts
The system SHALL validate same-origin requests on public sign-in mutations against a bounded set of trusted origins: the configured canonical origin and the request's own origin, and, only in the production environment, the deployment's project production domain. Outside the production environment the system SHALL NOT treat the project production domain as a trusted origin. It SHALL NOT accept wildcard hosts, and SHALL continue to reject a request whose origin is absent or matches no trusted origin.

#### Scenario: Request on the canonical origin
- **WHEN** a public sign-in mutation arrives with an origin equal to the configured canonical origin
- **THEN** the system accepts the request

#### Scenario: Request on the project production domain in production
- **WHEN** a public sign-in mutation arrives on the deployment's project production domain in the production environment
- **THEN** the system accepts the request rather than rejecting a host the application legitimately serves

#### Scenario: Request on the project production domain outside production
- **WHEN** a public sign-in mutation arrives with the project production domain as its origin outside the production environment
- **THEN** the system rejects the request

#### Scenario: Request with no origin
- **WHEN** a public sign-in mutation arrives with no origin header
- **THEN** the system rejects the request

#### Scenario: Request from an untrusted origin
- **WHEN** a public sign-in mutation arrives from an origin that matches no trusted origin
- **THEN** the system rejects the request
