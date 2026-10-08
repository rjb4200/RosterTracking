## MODIFIED Requirements

### Requirement: Live class command screen
The system SHALL show authorized class operators one class page that adapts to the class state with a single state-appropriate primary action: review and finalize the roster while the class is open, and no mutating action once the class is finalized. It SHALL show the class name, schedule, site, delivery method, plain-language status, and active attendance count. Assigned instructors SHALL operate their assigned classes; elevated staff SHALL operate department classes.

#### Scenario: Operate an open class
- **WHEN** an authorized operator opens an open class
- **THEN** the class page shows its live facts, attendance count, sign-in access, a read-only roster, and the single primary action to review and finalize

#### Scenario: Reach the finalize step
- **WHEN** an authorized operator chooses the primary action on an open class
- **THEN** the class page moves the operator to the review step where the class data and the roster are confirmed, corrected, and finalized

#### Scenario: Read-only after finalization
- **WHEN** an authorized operator opens a finalized class
- **THEN** the class page shows the retained record and history without class or roster editing actions

### Requirement: Embedded live roster
The system SHALL show active attendance rows with student name, agency when present, sign-in time, and credit exceptions on the class page, and SHALL offer authorized operators the class sign-in record without leaving the class page. While the class is open, the system SHALL keep the displayed roster current on its own, showing a newly signed-in attendee without the operator reloading the page, and SHALL add new rows in place without a flash, highlight, or sound. Credited-hour and removal corrections SHALL be made at the finalization step rather than on the class page.

#### Scenario: See a new sign-in without reloading
- **WHEN** a student signs in while an authorized operator has the open class page displayed
- **THEN** the attendee appears in the roster and the active attendance count increases without the operator reloading the page

#### Scenario: Reach the sign-in record
- **WHEN** an operator wants the printable attendance record for a class
- **THEN** the class page links to that class's sign-in record
