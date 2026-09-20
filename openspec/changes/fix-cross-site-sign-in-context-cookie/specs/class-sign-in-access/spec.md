## MODIFIED Requirements

### Requirement: Open classes have stable public short access
The system SHALL assign each class a globally unique, human-readable four-character public code and a corresponding short URL. The short URL SHALL resolve only while the class is open and SHALL lead the visitor to the class-specific student sign-in workflow. The entry route SHALL NOT establish the sign-in context as part of its redirect response, because a cross-site navigation discards a `SameSite=Lax` cookie set on that response. The sign-in context SHALL instead be established on the first-party sign-in page response, so a visitor arriving from an external application still receives a usable session.

#### Scenario: Resolve a short class URL
- **WHEN** a visitor requests the short URL for an open class
- **THEN** the system redirects to the student sign-in page for that class without exposing internal identifiers

#### Scenario: Arrive from an external application
- **WHEN** a visitor reaches an open class through a cross-site navigation such as scanning the QR code from a camera or messaging application
- **THEN** the sign-in page issues the sign-in context on its own first-party response and the visitor can begin sign-in

#### Scenario: Type a public class code
- **WHEN** a visitor supplies a valid public code for an open class through public class access
- **THEN** the system begins that class's student-access flow

#### Scenario: Reject an inactive public code
- **WHEN** a visitor requests a public code for a draft, completed, finalized, or cancelled class
- **THEN** the system returns a generic unavailable response without class details

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
