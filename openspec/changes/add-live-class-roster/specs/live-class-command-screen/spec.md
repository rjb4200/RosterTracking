## MODIFIED Requirements

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

## ADDED Requirements

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
