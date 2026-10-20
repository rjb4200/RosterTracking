## MODIFIED Requirements

### Requirement: Review first, edit only when needed

The workspace SHALL open in a review state presenting the class and schedule summary, the instructors and reporting destinations, the active attendance with credited hours, the readiness status with its blockers and advisories, and the available finalization action. Each summary area SHALL provide an editing affordance while the class is open, and choosing it SHALL open only that area's editor while preserving the operator's place. After an edit is saved the system SHALL refresh the summary and the readiness before finalization. The roster area SHALL present the active attendance as a compact table with one row per participant showing the participant, the credited hours, the adjustment, and the row actions; it SHALL NOT present a status column. A participant that needs attention SHALL be marked in the row and SHALL remain compact until the operator opens that row. Credited hours SHALL be presented in hours and minutes. Where the class is open, credited hours SHALL be entered in 15-minute increments bounded by the class scheduled total. Removed attendance SHALL be presented behind a collapsed affordance only when a participant was removed.

#### Scenario: Present the review state
- **WHEN** an authorized operator opens the workspace for an open class
- **THEN** the workspace shows the class and schedule summary, the instructors and destinations, the active attendance and credited hours, the readiness, and the finalization action

#### Scenario: Open one area's editor
- **WHEN** an operator chooses the editing affordance for a summary area
- **THEN** only that area's editor opens and the rest of the workspace keeps its place

#### Scenario: Refresh after a save
- **WHEN** an operator saves an edit in an area
- **THEN** the summary and the readiness status refresh before finalization is available

#### Scenario: Present the roster as a compact table
- **WHEN** a class's active participants have no issues
- **THEN** the roster shows one compact row per participant with the name, credited hours, adjustment, and row actions, and no status column

#### Scenario: Expand only the roster rows that need attention
- **WHEN** a participant has an invalid credit or a missing reporting context
- **THEN** that participant's row is marked as needing attention while every row, including that one, stays compact

#### Scenario: Expand a flagged row on demand
- **WHEN** an operator opens a row that is marked as needing attention
- **THEN** that row's detail is shown and the other rows stay compact

#### Scenario: Omit an empty removed-attendance affordance
- **WHEN** a class has no removed attendance
- **THEN** the workspace presents no removed-attendance affordance

### Requirement: Destination-specific finalization checks

The workspace SHALL show Mobile Training Unit usage only for a class whose selected destinations include the Mobile Training Unit, with exactly one editing surface for it. The MTU usage area SHALL present the recorded usage in full as a grouped review list — Equipment, Supplies, Transport, and Other — without truncation, and SHALL state that nothing is recorded when the usage is empty. Each supply SHALL be marked as estimated when it follows the roster estimate, and as set when an operator supplied the quantity, showing the roster estimate when it differs. Choosing the MTU area's editing affordance SHALL replace the review list with the editor. For an MTU class, missing usage SHALL be reported as a readiness issue that opens the MTU usage editor, and recording the usage SHALL be part of the pre-finalization workspace. For a class whose destinations do not include the MTU the workspace SHALL NOT show MTU controls. Recording MTU usage SHALL NOT alter the finalized participant count or the revision number.

#### Scenario: Require recorded usage for an MTU class
- **WHEN** an MTU class has no recorded usage
- **THEN** the workspace reports it as a readiness issue and withholds finalization until the usage is recorded

#### Scenario: Open the MTU editor from the issue
- **WHEN** an operator chooses the missing-usage issue
- **THEN** the MTU usage editor opens

#### Scenario: Hide MTU for a non-MTU class
- **WHEN** a class's destinations do not include the Mobile Training Unit
- **THEN** the workspace shows no MTU controls

#### Scenario: Summarise the recorded usage
- **WHEN** an MTU class has recorded equipment, supplies, transport, or free-text usage
- **THEN** the MTU usage area presents those recorded items grouped by kind, in full

#### Scenario: Show nothing recorded
- **WHEN** an MTU class has no recorded usage
- **THEN** the MTU usage area states that nothing is recorded

#### Scenario: Mark estimated and set supplies
- **WHEN** an MTU class records a supply that follows the roster estimate and another whose quantity an operator set
- **THEN** the review list marks the first as estimated and the second as set, showing the estimate when it differs

#### Scenario: Replace the list with the editor
- **WHEN** an operator chooses the MTU area's editing affordance
- **THEN** the review list is replaced by the MTU usage editor

#### Scenario: Keep the finalized roster stable
- **WHEN** MTU usage is recorded and the class is finalized
- **THEN** the finalized participant count and revision number are unaffected by the MTU usage

## ADDED Requirements

### Requirement: Advisory readiness warnings

The workspace SHALL present advisory warnings beside the readiness state. An advisory SHALL describe a condition worth checking without withholding finalization. While an MTU class records any supply that still follows the roster estimate, the workspace SHALL advise that those supplies use the estimate and SHALL provide a control that opens the MTU usage area. Advisories SHALL NOT withhold the finalize action.

#### Scenario: Advise on estimated supplies
- **WHEN** an MTU class records one or more supplies that still follow the roster estimate
- **THEN** the workspace advises how many supplies use the estimate

#### Scenario: Open the MTU area from the advisory
- **WHEN** an operator chooses the advisory's control
- **THEN** the MTU usage area opens

#### Scenario: Keep finalization available
- **WHEN** only advisories remain and no blocking issue is present
- **THEN** the workspace shows Ready to finalize and the finalize action remains available

#### Scenario: Clear the advisory when estimates are confirmed
- **WHEN** every estimated supply has been given an operator-set quantity
- **THEN** the workspace presents no estimate advisory

### Requirement: Hours are presented in hours and minutes

The workspace SHALL present credited hours in hours and minutes rather than decimal hours, in the roster, the class summary, the schedule summary, and the session rows. A whole-hour value SHALL be presented without a minutes part, and a value below one hour SHALL be presented in minutes.

#### Scenario: Present hours and minutes
- **WHEN** a participant is credited three and a half hours of a four-hour class
- **THEN** the roster presents the value as 3h 30m of 4h

#### Scenario: Present whole hours
- **WHEN** a value is a whole number of hours
- **THEN** it is presented as that many hours without a minutes part

#### Scenario: Present minutes below an hour
- **WHEN** a value is below one hour
- **THEN** it is presented in minutes

#### Scenario: Enter credit in quarter-hour steps
- **WHEN** an operator adjusts a participant's credited hours
- **THEN** the control offers hours and minutes in 15-minute increments bounded by the class scheduled total
