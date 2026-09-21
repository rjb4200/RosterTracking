## ADDED Requirements

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
