# Live Class Command Screen Specification

## Purpose

Give instructors and elevated staff one focused, responsive screen for operating a class throughout its lifecycle.

## Requirements

### Requirement: Live class command screen
The system SHALL show authorized class operators one class page that adapts to the class state with a single state-appropriate primary action: finish attendance and review while the class is open, review and finalize the roster when the class is completed, and no mutating action once the class is finalized. It SHALL show the course, schedule, site, delivery method, plain-language status, and active attendance count. Assigned instructors SHALL operate their assigned classes; elevated staff SHALL operate department classes.

#### Scenario: Operate an open class
- **WHEN** an authorized operator opens an open class
- **THEN** the class page shows its live facts, attendance count, sign-in access, a read-only roster, and the single primary action to finish attendance and review

#### Scenario: Finish attendance and reach the review step
- **WHEN** an authorized operator finishes attendance for an open class
- **THEN** the class page moves the operator to the review step where the class data and the roster are confirmed and corrected

#### Scenario: Show the next action by state
- **WHEN** an authorized operator opens a completed class
- **THEN** the class page offers the single primary action to review and finalize the roster, which opens the review step, and does not finalize the roster itself

#### Scenario: Read-only after finalization
- **WHEN** an authorized operator opens a finalized class
- **THEN** the class page shows the retained record and history without class or roster editing actions

### Requirement: Projectable sign-in access
The system SHALL let authorized operators copy the active class sign-in link and show its QR code in a full-screen presentation mode.

#### Scenario: Display a QR code
- **WHEN** an operator selects full-screen QR mode for an active class
- **THEN** the QR code and sign-in link are displayed prominently for students

### Requirement: Embedded live roster
The system SHALL show active attendance rows with student name, agency when present, sign-in time, and credit exceptions on the class page, and SHALL offer authorized operators manual attendance entry and the class sign-in record without leaving the class page. While the class is open, the system SHALL keep the displayed roster current on its own, showing a newly signed-in attendee without the operator reloading the page, and SHALL add new rows in place without a flash, highlight, or sound. Credited-hour and removal corrections SHALL be made at the finish-attendance step rather than on the class page.

#### Scenario: Add attendance during a class
- **WHEN** an operator adds a student manually to an open class
- **THEN** the class page refreshes with the attendee and updated count

#### Scenario: See a new sign-in without reloading
- **WHEN** a student signs in while an authorized operator has the open class page displayed
- **THEN** the attendee appears in the roster and the active attendance count increases without the operator reloading the page

#### Scenario: Reach the sign-in record
- **WHEN** an operator wants the printable attendance record for a class
- **THEN** the class page links to that class's sign-in record

### Requirement: Bounded live roster refresh
The system SHALL stop refreshing the class page roster once the class is no longer open, SHALL pause refreshing while the operator's browser tab is not visible and resume it when the tab becomes visible again, and SHALL stop refreshing once a fixed grace period has elapsed after the last scheduled session is due to end. Refreshing SHALL stop on its own without requiring the operator to take any action.

#### Scenario: Stop when the class closes
- **WHEN** the class leaves the open state while an operator is viewing it
- **THEN** the roster stops refreshing and the page shows the view appropriate to the new status

#### Scenario: Pause while the tab is hidden
- **WHEN** the operator switches away from the class page
- **THEN** roster refreshing pauses until the operator returns to the page

#### Scenario: Stop after the grace period
- **WHEN** the grace period after the last scheduled session has elapsed
- **THEN** the roster stops refreshing even if the class is still open
