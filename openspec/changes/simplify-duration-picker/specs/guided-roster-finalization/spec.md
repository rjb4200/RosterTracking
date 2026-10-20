## MODIFIED Requirements

### Requirement: The post-class review workspace

For an open class the system SHALL provide one post-class review workspace presenting a concise summary of the class, the schedule, the instructors, the reporting destinations, the roster, and the finalization status. The workspace SHALL let authorized operators correct class configuration, sessions, instructors, reporting destinations, attendance, and credited hours without leaving it, and SHALL show correction controls on demand. Correcting a session's duration SHALL use the same combined duration selection as class creation. The workspace SHALL NOT render every configuration form at once. It SHALL NOT offer manual attendance entry. It SHALL remain usable on desktop, tablet, and phone.

#### Scenario: Open the workspace
- **WHEN** an authorized operator opens the review screen for an open class
- **THEN** one workspace presents the class summary, the schedule, the instructors, the destinations, the roster, and the finalization status

#### Scenario: Correct without leaving the workspace
- **WHEN** an operator corrects class configuration, a session, an instructor, a reporting destination, attendance, or credited hours
- **THEN** the correction is made within the workspace and no separate screen is required

#### Scenario: Correct a session duration
- **WHEN** an operator edits a session's duration in the workspace
- **THEN** the duration is chosen from the same 30m–16h combined selection used in class creation and the session end time is recalculated

#### Scenario: Show one editor at a time
- **WHEN** an operator opens a correction area
- **THEN** only that area's editor is shown

#### Scenario: Do not offer manual attendance entry
- **WHEN** an operator uses the workspace
- **THEN** the system does not offer manual attendance entry

#### Scenario: Remain usable on a small screen
- **WHEN** an operator opens the workspace on a phone-sized viewport
- **THEN** the workspace remains usable without horizontal scrolling
