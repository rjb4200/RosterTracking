## MODIFIED Requirements

### Requirement: Sign-in failures are logged with correlation identifiers
The system SHALL log public sign-in and entry-route failures server-side with the class identifier when known and a request correlation identifier, and SHALL NOT log phone numbers, raw class or device tokens, credential values, or other personal values. A failure SHALL be classified by its distinct cause so that unrelated failures do not share one failure kind.

#### Scenario: A failure is diagnosable
- **WHEN** a public sign-in action fails
- **THEN** a server log entry records the failure kind, the correlation identifier, and the class identifier when known, without sensitive values

#### Scenario: A rejected request origin is distinguishable
- **WHEN** a public sign-in mutation is rejected because its request origin is not trusted
- **THEN** the log entry records a failure kind specific to a rejected origin

#### Scenario: A missing sign-in context is distinguishable
- **WHEN** a public sign-in mutation is rejected because the sign-in context is absent
- **THEN** the log entry records a failure kind specific to a missing sign-in context, distinct from a rejected origin

#### Scenario: Both failures share one student response
- **WHEN** either a rejected origin or a missing sign-in context occurs
- **THEN** the student receives the same generic unavailable response and no failure detail

## ADDED Requirements

### Requirement: Same-origin validation accepts the served hosts
The system SHALL validate same-origin requests on public sign-in mutations against a bounded set of trusted origins: the configured canonical origin, the request's own origin, and the deployment's project production domain. It SHALL NOT accept wildcard hosts, and SHALL continue to reject a request whose origin is absent or matches no trusted origin.

#### Scenario: Request on the canonical origin
- **WHEN** a public sign-in mutation arrives with an origin equal to the configured canonical origin
- **THEN** the system accepts the request

#### Scenario: Request on the project production domain
- **WHEN** a public sign-in mutation arrives on the deployment's project production domain
- **THEN** the system accepts the request rather than rejecting a host the application legitimately serves

#### Scenario: Request with no origin
- **WHEN** a public sign-in mutation arrives with no origin header
- **THEN** the system rejects the request

#### Scenario: Request from an untrusted origin
- **WHEN** a public sign-in mutation arrives from an origin that matches no trusted origin
- **THEN** the system rejects the request
