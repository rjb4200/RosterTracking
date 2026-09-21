# Live Class Command Screen Specification

## Purpose

Give instructors and elevated staff one focused, responsive screen for operating a class throughout its lifecycle.

## Requirements

### Requirement: Live class command screen
The system SHALL show authorized class operators one class page that adapts to the class state with a single state-appropriate primary action: finish attendance and review while the class is open, finalize the roster when the class is completed, and no mutating action once the class is finalized. It SHALL show the course, schedule, site, delivery method, plain-language status, and active attendance count. Assigned instructors SHALL operate their assigned classes; elevated staff SHALL operate department classes.

#### Scenario: Operate an open class
- **WHEN** an authorized operator opens an open class
- **THEN** the class page shows its live facts, attendance count, sign-in access, a read-only roster, and the single primary action to finish attendance and review

#### Scenario: Show the next action by state
- **WHEN** an authorized operator opens a completed class
- **THEN** the class page offers the primary action to finalize the roster and links to the review step where attendance corrections are made

#### Scenario: Read-only after finalization
- **WHEN** an authorized operator opens a finalized class
- **THEN** the class page shows the retained record and history without class or roster editing actions

### Requirement: Projectable sign-in access
The system SHALL let authorized operators copy the active class sign-in link and show its QR code in a full-screen presentation mode.

#### Scenario: Display a QR code
- **WHEN** an operator selects full-screen QR mode for an active class
- **THEN** the QR code and sign-in link are displayed prominently for students

### Requirement: Embedded live roster
The system SHALL show active attendance rows with student name, agency when present, sign-in time, and credit exceptions on the class page, and SHALL offer authorized operators manual attendance entry and the class sign-in record without leaving the class page. Credited-hour and removal corrections SHALL be made at the finish-attendance step rather than on the class page.

#### Scenario: Add attendance during a class
- **WHEN** an operator adds a student manually to an open class
- **THEN** the class page refreshes with the attendee and updated count

#### Scenario: Reach the sign-in record
- **WHEN** an operator wants the printable attendance record for a class
- **THEN** the class page links to that class's sign-in record
