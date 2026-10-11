# Public Class Directory Specification

## Purpose

Provide a minimal public view of classes currently accepting attendance so students can locate and begin the appropriate sign-in flow without instructor-distributed links.
## Requirements
### Requirement: Public directory lists only open classes
The system SHALL present a public landing-page directory containing only classes that are in the open state and whose first scheduled session is within the display window. It SHALL list a class starting 18 hours before its first scheduled session and SHALL stop listing it 36 hours after its first scheduled session. Each entry SHALL disclose only the class name, next scheduled session date and time, in-person site name or `Virtual` delivery label, and assigned instructor names formatted as first initial plus last name.

#### Scenario: View classes inside the display window
- **WHEN** a visitor opens the public landing page while an open class's first session is within the display window
- **THEN** the visitor sees that class and no class outside the window or in a non-open state

#### Scenario: Hide a future class outside the window
- **WHEN** an open class's first scheduled session is more than 18 hours away
- **THEN** the class is not listed in the public directory

#### Scenario: Hide a class after the window closes
- **WHEN** more than 36 hours have passed since an open class's first scheduled session
- **THEN** the class is not listed in the public directory

#### Scenario: View an open virtual class
- **WHEN** an open class within the window has virtual delivery
- **THEN** its public entry displays `Virtual` instead of a training-site name

### Requirement: Public directory provides student access actions
The system SHALL provide a student sign-in action and an expandable QR code for each listed open class. Both actions SHALL use that class's stable public short URL.

#### Scenario: Begin sign-in from a class card
- **WHEN** a visitor selects student sign-in for an open class
- **THEN** the visitor is taken to that class's public student-access flow

#### Scenario: Display a class QR code
- **WHEN** a visitor expands the QR code for an open class
- **THEN** the displayed QR code encodes that class's public short URL

### Requirement: Public class views protect internal information
The public directory and public student-access flow SHALL NOT disclose rosters, attendance data, reporting requirements, class identifiers, staff account information, access PIN values, or details of non-open classes.

#### Scenario: Request unavailable class access
- **WHEN** a visitor requests a public class URL for a class that is not open
- **THEN** the system returns a generic unavailable response without class details

### Requirement: Empty directory orients the visitor

The system SHALL present an explanatory message when no class is open for sign-in, describing that classes appear here when an instructor opens them, and SHALL NOT present any staff action to a visitor.

#### Scenario: No class is open for sign-in
- **WHEN** a visitor opens the public landing page and no class is within the display window
- **THEN** the directory explains that no class is open for sign-in, states that classes appear here when opened, and offers no action

