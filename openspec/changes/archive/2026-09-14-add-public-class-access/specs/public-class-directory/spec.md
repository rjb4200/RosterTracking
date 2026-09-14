## Purpose

Provide a minimal public view of classes currently accepting attendance so students can locate and begin the appropriate sign-in flow without instructor-distributed links.

## ADDED Requirements

### Requirement: Public directory lists only open classes
The system SHALL present a public landing-page directory containing only classes in the open state. Each entry SHALL disclose only the course name, next scheduled session date and time, in-person site name or `Virtual` delivery label, and assigned instructor names formatted as first initial plus last name.

#### Scenario: View active classes
- **WHEN** a visitor opens the public landing page while classes are open
- **THEN** the visitor sees one entry for each open class and no draft, completed, finalized, or cancelled class

#### Scenario: View an open virtual class
- **WHEN** an open class has virtual delivery
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
