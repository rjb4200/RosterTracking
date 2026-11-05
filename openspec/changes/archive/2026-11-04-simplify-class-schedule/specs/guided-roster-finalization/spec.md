# Spec Delta

## MODIFIED Requirements

### Requirement: The post-class review workspace

For an open class the system SHALL provide one post-class review workspace presenting a concise summary of the class, the schedule, the instructors, the reporting destinations, the roster, and the finalization status. The workspace SHALL let authorized operators correct class configuration, subject durations, instructors, reporting destinations, attendance, and credited hours without leaving it, and SHALL show correction controls on demand. Correcting a subject's duration SHALL use the same combined duration selection as class creation and SHALL recalculate that subject's end, every later subject's start and end, and the class total. The workspace SHALL NOT render every configuration form at once. It SHALL NOT offer manual attendance entry. It SHALL remain usable on desktop, tablet, and phone.

#### Scenario: Open the workspace
- **WHEN** an authorized operator opens the review screen for an open class
- **THEN** one workspace presents the class summary, the schedule, the instructors, the destinations, the roster, and the finalization status

#### Scenario: Correct without leaving the workspace
- **WHEN** an operator corrects class configuration, a subject duration, an instructor, a reporting destination, attendance, or credited hours
- **THEN** the correction is made within the workspace and no separate screen is required

#### Scenario: Correct a session duration
- **WHEN** an operator edits a subject's duration in the workspace
- **THEN** the duration is chosen from the same 30m–16h combined selection used in class creation, and the subject end, every later subject start and end, and the class total are recalculated

#### Scenario: Show one editor at a time
- **WHEN** an operator opens a correction area
- **THEN** only that area's editor is shown

#### Scenario: Do not offer manual attendance entry
- **WHEN** an operator uses the workspace
- **THEN** the system does not offer manual attendance entry

#### Scenario: Remain usable on a small screen
- **WHEN** an operator opens the workspace on a phone-sized viewport
- **THEN** the workspace remains usable without horizontal scrolling

### Requirement: The schedule editor sets a session's methods
While a class is open, the schedule editor SHALL present the class method set as independent choices. The class method set SHALL be a non-empty combination of CR, HO, and OL. Changing the class method set SHALL update every subject. The editor SHALL reject saving the class with no method selected and SHALL NOT offer a per-subject method override.

#### Scenario: Choose CR and HO for one session
- **WHEN** an operator sets the class method set to CR and HO
- **THEN** the class records both methods and every subject uses CR and HO

#### Scenario: Change one session without changing the others
- **WHEN** an operator changes the class method set
- **THEN** every subject updates to the new set and no subject keeps an independent method

#### Scenario: Start a new session from the class default
- **WHEN** an operator adds a subject to a class whose method set is CR and HO
- **THEN** the new subject uses CR and HO

#### Scenario: Reject an empty method selection
- **WHEN** an operator tries to save the class with no method selected
- **THEN** the editor rejects the save and asks for at least one method

#### Scenario: Do not offer a per-subject override
- **WHEN** an operator edits a subject duration
- **THEN** the editor does not offer a method control for that subject

### Requirement: The schedule editor enters session hours in 15-minute increments
While a class is open, the schedule editor SHALL let an operator enter a subject's credited hours as hours and minutes in 15-minute increments. It SHALL derive the subject's end time from its start and duration, SHALL derive every later subject's start and end, and SHALL present the class total as the sum of subject durations. The editor SHALL reject a credited duration that is not a whole 15-minute increment.

#### Scenario: Enter two hours and fifteen minutes
- **WHEN** an operator sets a subject's duration to two hours and fifteen minutes
- **THEN** the subject stores 2.25 credited hours and its end time is its start plus two hours and fifteen minutes

#### Scenario: Present session hours in hours and minutes
- **WHEN** a subject stores 2.5 credited hours
- **THEN** the schedule presents the duration as 2h 30m

#### Scenario: Reject a duration outside the quarter-hour cadence
- **WHEN** a subject is submitted with a credited duration that is not a whole 15-minute increment
- **THEN** the editor rejects the save

#### Scenario: Recalculate later subjects
- **WHEN** an operator changes an earlier subject's duration
- **THEN** every later subject's start and end are recalculated sequentially

#### Scenario: Present the summed class total
- **WHEN** a class has a 1.5-hour subject and a 0.5-hour subject
- **THEN** the schedule presents a 2.0-hour class total

### Requirement: The review screen adjusts a class that ran long

For an open class, the workspace SHALL present the class scheduled total in its schedule area with an affordance to change it. Increasing a subject's duration SHALL raise the class scheduled total and SHALL credit every active participant whose credited hours equal the previous total with the new total and SHALL leave participants credited below the previous total unchanged. The system SHALL continue to accept a participant's credited hours only from zero through the current scheduled total.

#### Scenario: Credit everyone after a class runs long
- **WHEN** an authorized operator increases a subject duration so the class scheduled total rises
- **THEN** every active participant still credited at the previous total is credited at the new total

#### Scenario: Leave individually adjusted participants unchanged
- **WHEN** an authorized operator increases the class scheduled total while a participant is credited below the previous total with a reason
- **THEN** that participant keeps the lower credited hours and the recorded reason

#### Scenario: Keep credit within the new total
- **WHEN** an authorized operator sets a participant's credited hours after the scheduled total changed
- **THEN** the system accepts the value only from zero through the current scheduled total
