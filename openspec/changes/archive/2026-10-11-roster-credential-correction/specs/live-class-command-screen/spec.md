## MODIFIED Requirements

### Requirement: Embedded live roster
The system SHALL show active attendance rows with student name, agency when present, sign-in time, and credit exceptions on the class page, and SHALL offer authorized operators the class sign-in record without leaving the class page. While the class is open, the class page and the review step SHALL offer credential correction for a prompted credential. Credited-hour and removal corrections SHALL be made at the finalization step rather than on the class page. While the class is open, the system SHALL keep the displayed roster current on its own, showing a newly signed-in attendee without the operator reloading the page, and SHALL add new rows in place without a flash, highlight, or sound.

#### Scenario: See a new sign-in without reloading
- **WHEN** a student signs in while an authorized operator has the open class page displayed
- **THEN** the attendee appears in the roster and the active attendance count increases without the operator reloading the page

#### Scenario: Reach the sign-in record
- **WHEN** an operator wants the printable attendance record for a class
- **THEN** the class page links to that class's sign-in record

#### Scenario: Correct a credential from the live roster
- **WHEN** an authorized operator corrects an attendee's prompted credential from the open class page with a reason
- **THEN** the system applies the correction and the roster reflects any resulting inclusion change
