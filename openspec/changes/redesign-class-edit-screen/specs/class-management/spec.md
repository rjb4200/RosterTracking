## ADDED Requirements

### Requirement: The open-class edit screen is organized by reporting destination

The system SHALL present the open-class edit screen as a set of named cards organized by the class's selected reporting destinations, and SHALL show only the cards a class's selection requires. It SHALL show the EMS course-details card only while KBEMS is selected and the MTU usage card only while MTU is selected; it SHALL reveal a session's Fire subject fields only while Fire is selected and the session Method only while KBEMS is selected. It SHALL present class basics, student access, sessions, and instructors for every class. The screen SHALL state that edits apply to the live sign-in roster and that finalization happens on the review screen, SHALL provide navigation to each card with its item count, and SHALL present a summary of the class's status, schedule, total credited hours, reporting destinations, lead instructor, and PIN state.

#### Scenario: Show only the cards a class needs
- **WHEN** an open class reports to Fire and KBEMS but not MTU
- **THEN** the screen shows the Fire-driven session fields and the EMS course-details card and does not show the MTU usage card

#### Scenario: Reveal a card when a destination is selected
- **WHEN** an operator selects MTU in the reporting selection
- **THEN** the MTU usage card appears without a page reload

#### Scenario: Hide a card when a destination is cleared
- **WHEN** an operator clears KBEMS in the reporting selection
- **THEN** the EMS course-details card is hidden

#### Scenario: Reveal session fields by destination
- **WHEN** a class selects Fire but not KBEMS
- **THEN** the session editor shows the Fire subject fields and does not require or show the KBEMS Method

#### Scenario: Organize a combined Fire and KBEMS session
- **WHEN** a class selects both Fire and KBEMS
- **THEN** the session editor presents the Fire subject fields and the KBEMS Method together, with category options grouped by destination rather than silently filtered to one

#### Scenario: State the workflow on the screen
- **WHEN** an operator opens the edit screen for an open class
- **THEN** the screen states that edits reach the live sign-in roster and that finalization happens on the review screen

### Requirement: The edit screen presents sessions as an editable schedule

The system SHALL list a class's sessions in scheduled order as read-only rows showing the session's scheduled range, credited hours, and identifying title or Fire subject, with a running total of credited hours and an indication when sessions overlap on the same day. The system SHALL keep at most one session editor open at a time and SHALL provide controls to add a session and to remove a session. The system SHALL refuse to remove the only remaining session of an open class.

#### Scenario: Read the schedule at a glance
- **WHEN** an operator views a class with more than one session
- **THEN** the sessions appear as ordered rows with their times, hours, and a running total

#### Scenario: Edit one session at a time
- **WHEN** an operator opens a session for editing
- **THEN** that session's editor is shown and any other open session editor is closed

#### Scenario: Add and remove a session
- **WHEN** an operator removes a session from a class that has more than one
- **THEN** the system removes it and updates the schedule and total

#### Scenario: Refuse removing the last session
- **WHEN** an operator attempts to remove a class's only session
- **THEN** the system refuses and keeps the session

### Requirement: The edit screen presents instructors with their consequences

The system SHALL present a class's instructors with explicit lead and assisting roles, SHALL let an authorized operator change the lead assignment and remove an instructor assignment, and SHALL refuse to remove the last lead instructor. The screen SHALL state that the lead instructor signs the roster and, while Fire is selected, that at least one assigned instructor must be fire-qualified.

#### Scenario: Change the lead instructor
- **WHEN** an operator selects a different instructor as the lead
- **THEN** that instructor becomes the only lead assignment and the change is saved

#### Scenario: Remove an instructor
- **WHEN** an operator removes an assigned instructor who is not the last lead
- **THEN** the system removes the assignment

#### Scenario: Refuse removing the last lead
- **WHEN** an operator attempts to remove the class's only lead instructor
- **THEN** the system refuses and keeps the assignment

#### Scenario: State the Fire instructor requirement
- **WHEN** a class selects the Fire destination
- **THEN** the instructors card states that at least one assigned instructor must be fire-qualified

## MODIFIED Requirements

### Requirement: Class retains EMS course type and number

The system SHALL let a class store an EMS course type and a course number. These SHALL be editable while the class is open, SHALL be present only while KBEMS is selected, SHALL be preserved at finalization, and SHALL be available to completion-certificate output. Removing KBEMS from an open class SHALL clear its EMS course details on save, and the system SHALL NOT retain EMS course details for a class that does not report to KBEMS.

#### Scenario: Save EMS course details
- **WHEN** staff save a class with a course type and course number
- **THEN** the system stores those values on the class

#### Scenario: Clear EMS course details when KBEMS is removed
- **WHEN** staff remove KBEMS from an open class and save
- **THEN** the class no longer retains a course type, course number, EMS category, or EMS objectives

#### Scenario: Reject EMS details without KBEMS
- **WHEN** a save submits EMS course details for a class that does not report to KBEMS
- **THEN** the system does not retain those values

#### Scenario: Preserve EMS course details at finalization
- **WHEN** a class with a course type and course number is finalized
- **THEN** the revision retains both values for certificate generation

#### Scenario: Later class edit does not rewrite history
- **WHEN** the class course type or number changes after finalization
- **THEN** the existing revision keeps the values captured at finalization
