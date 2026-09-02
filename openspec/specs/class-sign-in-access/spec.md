# Class Sign-In Access Specification

## Purpose

Provide a secure, class-specific public entry URL that future student sign-in workflows can resolve without exposing class details or reusable staff credentials.

## Requirements

### Requirement: Each class has an opaque sign-in token
The system SHALL generate an unpredictable, class-specific sign-in token and store only a non-reversible hash of that token. Raw token values SHALL not be written to audit records or returned after their generation response.

#### Scenario: Generate a class sign-in link
- **WHEN** staff create a class or rotate its sign-in access
- **THEN** the system returns a new opaque sign-in URL once and persists only its token hash

### Requirement: Staff can obtain a QR code for newly generated access
The system SHALL present a QR code for the newly generated class sign-in URL so staff can display or print the access entry point.

#### Scenario: Show QR code after token generation
- **WHEN** a new class sign-in token is generated
- **THEN** staff can view a QR code encoding the corresponding public URL

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

### Requirement: Token rotation invalidates prior access
The system SHALL allow authorized staff to rotate class sign-in access before completion. Rotation SHALL invalidate the previous token immediately.

#### Scenario: Rotate sign-in access
- **WHEN** authorized staff rotate the sign-in token for an open class
- **THEN** the prior token no longer resolves and the new token is shown once with its QR code
