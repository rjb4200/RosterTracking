## Purpose

Give instructors and elevated staff one focused, responsive screen for operating a class throughout its lifecycle.

## ADDED Requirements

### Requirement: Live class command screen
The system SHALL show authorized class operators a command screen with the course, schedule, site, delivery method, plain-language status, and active attendance count. Assigned instructors SHALL operate their assigned classes; elevated staff SHALL operate department classes.

#### Scenario: Operate an active class
- **WHEN** an authorized operator opens an active class
- **THEN** the command screen shows its live facts, attendance count, sign-in access, roster, and primary operational action

### Requirement: Projectable sign-in access
The system SHALL let authorized operators copy the active class sign-in link and show its QR code in a full-screen presentation mode.

#### Scenario: Display a QR code
- **WHEN** an operator selects full-screen QR mode for an active class
- **THEN** the QR code and sign-in link are displayed prominently for students

### Requirement: Embedded live roster
The system SHALL show active attendance rows with student name, agency when present, sign-in time, and credit exceptions, and SHALL offer authorized operators manual attendance entry without leaving the command screen.

#### Scenario: Add attendance during a class
- **WHEN** an operator adds a student manually to an active class
- **THEN** the command screen refreshes with the attendee and updated count
