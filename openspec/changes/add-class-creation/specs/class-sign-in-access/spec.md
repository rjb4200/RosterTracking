## Purpose

Provide a secure, class-specific public entry URL that future student sign-in workflows can resolve without exposing class details or reusable staff credentials.

## ADDED Requirements

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
The system SHALL resolve a valid sign-in token only for an open class. Requests with unknown, cancelled, completed, draft, or finalized class tokens SHALL not reveal class details.

#### Scenario: Resolve an open class token
- **WHEN** a visitor requests a valid token for an open class
- **THEN** the system establishes the class context for the later student sign-in flow

#### Scenario: Reject inactive class token
- **WHEN** a visitor requests a token for a class that is not open
- **THEN** the system returns a generic unavailable response without class details

### Requirement: Token rotation invalidates prior access
The system SHALL allow authorized staff to rotate class sign-in access before completion. Rotation SHALL invalidate the previous token immediately.

#### Scenario: Rotate sign-in access
- **WHEN** authorized staff rotate the sign-in token for an open class
- **THEN** the prior token no longer resolves and the new token is shown once with its QR code
