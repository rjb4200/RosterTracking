## MODIFIED Requirements

### Requirement: Public token resolution is state-limited
The system SHALL resolve a valid sign-in token only for an open class. A resolved token SHALL establish a server-validated class context bound to the current class sign-in token version and present the public student identification and attendance workflow without exposing the raw token to application logs. Requests with unknown, rotated, cancelled, completed, draft, or finalized class tokens SHALL not reveal class details.

#### Scenario: Resolve an open class token
- **WHEN** a visitor requests a valid token for an open class
- **THEN** the system presents the student sign-in workflow within that class context

#### Scenario: Remove the token after initial resolution
- **WHEN** the server resolves a valid raw class token
- **THEN** it establishes the protected workflow context, redirects to a tokenless path, sets a no-referrer policy, and excludes the raw token from application logs, analytics, and error metadata

#### Scenario: Maintain class context through sign-in
- **WHEN** a visitor advances through identification, requirement completion, and attendance confirmation
- **THEN** each step revalidates the same open class and current token version before reading or writing sign-in data

#### Scenario: Invalidate context after token rotation
- **WHEN** staff rotate class sign-in access after a visitor established workflow context
- **THEN** the visitor's prior context is rejected and cannot continue the sign-in workflow

#### Scenario: Reject inactive class token
- **WHEN** a visitor requests a token for a class that is not open
- **THEN** the system returns a generic unavailable response without class details
