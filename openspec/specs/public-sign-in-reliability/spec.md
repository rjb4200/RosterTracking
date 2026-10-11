# Public Sign-In Reliability Specification

## Purpose

Keep public student sign-in contained and observable so a dependency, configuration, or data failure produces a usable response and a diagnosable log instead of an unexplained crash.
## Requirements
### Requirement: Public sign-in failures are contained
The system SHALL provide error boundaries for the public sign-in route tree and the staff route tree so an unexpected failure renders a usable page with a generic message and a recovery action rather than a framework error.

#### Scenario: Unexpected failure on a public page
- **WHEN** a public sign-in page throws during rendering
- **THEN** the visitor sees a generic, non-technical message with a way to try again

#### Scenario: Unexpected failure on a staff page
- **WHEN** a staff page throws during rendering
- **THEN** the staff member sees a generic message without internal details

### Requirement: Public mutations degrade to a generic response
The system SHALL catch database, rate-limit, workflow, and configuration failures in public sign-in actions and entry routes and SHALL return the same generic unavailable response used for an unknown or expired session, without exposing internal error details.

#### Scenario: Rate-limit store is unavailable
- **WHEN** the rate-limit store fails during a public action
- **THEN** the visitor receives the generic unavailable response and no attendance is recorded

#### Scenario: Pin verification path fails
- **WHEN** class PIN verification or workflow creation fails
- **THEN** the visitor receives the generic unavailable response instead of an unhandled error

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

### Requirement: Same-origin validation accepts the served hosts
The system SHALL validate same-origin requests on public sign-in mutations against a bounded set of trusted origins: the configured canonical origin and the request's own origin, and, only in the production environment, the deployment's project production domain. Outside the production environment the system SHALL NOT treat the project production domain as a trusted origin. It SHALL NOT accept wildcard hosts, and SHALL continue to reject a request whose origin is absent or matches no trusted origin.

#### Scenario: Request on the canonical origin
- **WHEN** a public sign-in mutation arrives with an origin equal to the configured canonical origin
- **THEN** the system accepts the request

#### Scenario: Request on the project production domain
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

### Requirement: Credential key health is verifiable
The system SHALL verify that the configured credential encryption key can decrypt a known probe value and SHALL report a clear, actionable failure when it cannot, so an unusable key is detected before students encounter it.

#### Scenario: Detect a mismatched key
- **WHEN** the configured credential key cannot decrypt the stored probe value
- **THEN** the system reports that stored credentials and PINs cannot be read and identifies the credential key as the cause

#### Scenario: Key health passes
- **WHEN** the configured credential key decrypts the probe value
- **THEN** the key-health check reports a healthy result

### Requirement: Sign-in context is established on a first-party response
The system SHALL establish the student sign-in context only on a first-party response on the sign-in route, and SHALL NOT establish it on an entry route's redirect response. The context cookie SHALL keep `HttpOnly`, `Secure` in production, `SameSite=Lax`, a path limited to the sign-in route, and a short bounded lifetime. A visitor arriving through a cross-site navigation SHALL receive a usable sign-in session, and an entry route SHALL NOT be the sole source of that session.

#### Scenario: Cross-site arrival yields a usable session
- **WHEN** a visitor arrives from an external application, follows the entry redirect, and submits their phone number
- **THEN** the sign-in context is present on that submission and the lookup proceeds rather than returning the unavailable response

#### Scenario: Entry redirect does not carry the context cookie
- **WHEN** a visitor requests a class entry URL
- **THEN** the redirect response does not set the sign-in context cookie

#### Scenario: Context cookie attributes are unchanged
- **WHEN** the sign-in route establishes the sign-in context
- **THEN** the cookie is `HttpOnly`, `Secure` in production, `SameSite=Lax`, limited to the sign-in path, and expires within the configured short lifetime

#### Scenario: First-party reload keeps the session
- **WHEN** a visitor with an existing valid sign-in context reloads the sign-in route
- **THEN** the system reuses that context rather than discarding the visitor's progress

### Requirement: Context is recoverable when it is absent
The system SHALL establish a fresh sign-in context when a visitor reaches the sign-in route for an open class without a valid one, so that an absent or discarded cookie does not permanently block sign-in. Where the request cannot supply the class, the system SHALL return the generic unavailable response without class detail.

#### Scenario: Recover an absent context
- **WHEN** a visitor reaches the sign-in route with no sign-in context but a resolvable open class
- **THEN** the system establishes a new sign-in context and presents the phone step

#### Scenario: Absent context with no resolvable class
- **WHEN** a visitor reaches the sign-in route with no sign-in context and no resolvable open class
- **THEN** the system returns the generic unavailable response without class details

