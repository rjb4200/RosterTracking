# Class Sign-In Access Specification

## Purpose

Provide a secure, class-specific public entry URL that future student sign-in workflows can resolve without exposing class details or reusable staff credentials.

## Requirements

### Requirement: Each class has secure and stable public sign-in access
The system SHALL assign every class a globally unique stable public code. New class QR codes and public student links SHALL use the corresponding stable short URL rather than an opaque raw token. The system MAY retain an unpredictable class-specific raw sign-in token by storing only its non-reversible hash for legacy-link compatibility. Raw token values SHALL not be written to audit records or returned after their generation response.

#### Scenario: Generate student access for a new class
- **WHEN** staff create a class or obtain its student access material
- **THEN** the system provides the stable public URL and QR code, and persists the class public code

#### Scenario: Retain a generated raw token securely
- **WHEN** the system generates a raw token for legacy sign-in compatibility
- **THEN** it persists only the token hash and does not record the raw value in audit data

### Requirement: Staff can obtain QR codes for stable public access
The system SHALL present a QR code for the stable public class URL so authorized staff can display or print a persistent student access entry point while the class is open.

#### Scenario: Show QR code for stable public access
- **WHEN** an authorized staff member views student access material for an open class
- **THEN** the staff member can view a QR code encoding the stable public URL

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

### Requirement: Token rotation invalidates only prior raw-token access
The system SHALL allow authorized staff to rotate legacy raw-token sign-in access before completion. Rotation SHALL invalidate the previous raw token immediately and SHALL NOT change the class's stable public URL or its QR code.

#### Scenario: Rotate legacy raw-token access
- **WHEN** authorized staff rotate the sign-in token for an open class
- **THEN** the prior raw token no longer resolves and the class's stable public URL remains unchanged

### Requirement: Active class sign-in presentation
The system SHALL provide authorized operators a command-screen presentation of the active class sign-in link, QR code, and access PIN when configured.

#### Scenario: Copy sign-in link
- **WHEN** an operator copies the active class sign-in link
- **THEN** the system copies the stable public link without exposing token material

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

### Requirement: Stable public access is available to authorized instructors
The system SHALL let authorized instructors view the stable short URL and QR code for their open class. The displayed QR code SHALL encode the stable short URL.

#### Scenario: View student access material for an open class
- **WHEN** an authorized instructor views an open class
- **THEN** the instructor can view its short URL and QR code

### Requirement: Existing raw-token links remain supported for open classes
The system SHALL continue to resolve an existing valid raw-token sign-in URL for an open class until that class leaves the open state. Authorized instructors SHALL be able to generate stable public short access for an already-open class that does not yet have it. A raw-token entry SHALL lead the visitor to the student sign-in workflow and SHALL NOT set the sign-in context on its redirect response.

#### Scenario: Use a legacy raw-token link
- **WHEN** a visitor requests a valid existing raw-token URL for an open class
- **THEN** the system leads the visitor to that class's student sign-in workflow, which establishes the sign-in context on its first-party response

#### Scenario: Provision stable access for a legacy open class
- **WHEN** an authorized instructor requests student access material for an open class created before stable public access was available
- **THEN** the system assigns and displays a stable public short URL and QR code for that class

### Requirement: Optional numeric PIN gates student workflow entry
The system SHALL support an optional class access PIN that, when enabled, requires a visitor to enter the current four-digit numeric PIN before the system establishes the student sign-in workflow context. The PIN SHALL be preserved as a four-character value, including leading zeroes, and SHALL NOT be included in public directory data, URLs, logs, analytics, or error metadata. A successful PIN entry SHALL lead to the sign-in workflow, which establishes the sign-in context on its first-party response.

#### Scenario: Enter an enabled PIN-protected class
- **WHEN** a visitor reaches an open class whose access PIN is enabled and submits the correct four-digit numeric PIN
- **THEN** the system leads the visitor to the class-specific student sign-in workflow, which establishes the sign-in context

#### Scenario: Reject an invalid PIN
- **WHEN** a visitor reaches an open class whose access PIN is enabled and submits a missing, malformed, or incorrect PIN
- **THEN** the system does not establish a student sign-in workflow context

#### Scenario: Enter a class without an enabled PIN
- **WHEN** a visitor reaches an open class whose access PIN is disabled
- **THEN** the system leads the visitor to the student sign-in workflow without requesting a PIN
