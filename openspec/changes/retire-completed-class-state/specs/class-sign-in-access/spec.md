## MODIFIED Requirements

### Requirement: Public token resolution is state-limited
The system SHALL resolve a valid raw sign-in token only for an open class. A resolved token SHALL establish a server-validated class context bound to the current class sign-in token version and present the public student identification and attendance workflow without exposing the raw token to application logs. When the class has an enabled access PIN, the system SHALL require correct PIN verification before establishing that context. Requests with unknown, rotated, cancelled, draft, or finalized class tokens SHALL not reveal class details.

#### Scenario: Resolve an open class token
- **WHEN** a visitor requests a valid token for an open class
- **THEN** the system presents the student sign-in workflow within that class context

#### Scenario: Require PIN after resolving an open class token
- **WHEN** a visitor requests a valid token for an open class with an enabled access PIN
- **THEN** the system requests PIN verification before presenting the student sign-in workflow

#### Scenario: Remove the token after initial resolution
- **WHEN** the server resolves a valid raw class token
- **THEN** it establishes a tokenless protected access state, redirects to a tokenless path, requires PIN verification before establishing the student workflow when enabled, sets a no-referrer policy, and excludes the raw token from application logs, analytics, and error metadata

#### Scenario: Maintain class context through sign-in
- **WHEN** a visitor advances through identification, requirement completion, and attendance confirmation
- **THEN** each step revalidates the same open class and current token version before reading or writing sign-in data

#### Scenario: Invalidate context after token rotation
- **WHEN** staff rotate class sign-in access after a visitor established workflow context
- **THEN** the visitor's prior context is rejected and cannot continue the sign-in workflow

#### Scenario: Reject inactive class token
- **WHEN** a visitor requests a token for a class that is not open
- **THEN** the system returns a generic unavailable response without class details

### Requirement: Open classes have stable public short access
The system SHALL assign each class a globally unique, human-readable four-character public code and a corresponding short URL. The short URL SHALL resolve only while the class is open and SHALL lead the visitor to the class-specific student sign-in workflow. The entry route SHALL NOT establish the sign-in context as part of its redirect response, because a cross-site navigation discards a `SameSite=Lax` cookie set on that response. The sign-in context SHALL instead be established on the first-party response on the sign-in route, so a visitor arriving from an external application still receives a usable session.

#### Scenario: Resolve a short class URL
- **WHEN** a visitor requests the short URL for an open class
- **THEN** the system leads the visitor to the student sign-in workflow for that class without exposing internal identifiers

#### Scenario: Arrive from an external application
- **WHEN** a visitor reaches an open class through a cross-site navigation such as scanning the QR code from a camera or messaging application
- **THEN** the sign-in route issues the sign-in context on its own first-party response and the visitor can begin sign-in

#### Scenario: Type a public class code
- **WHEN** a visitor supplies a valid public code for an open class through public class access
- **THEN** the system begins that class's student-access flow

#### Scenario: Reject an inactive public code
- **WHEN** a visitor requests a public code for a draft, finalized, or cancelled class
- **THEN** the system returns a generic unavailable response without class details
