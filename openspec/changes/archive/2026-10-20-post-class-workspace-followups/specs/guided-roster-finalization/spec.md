## MODIFIED Requirements

### Requirement: Review first, edit only when needed

The workspace SHALL open in a review state presenting the class and schedule summary, the instructors and reporting destinations, the active attendance with credited hours, the readiness status with its blockers, and the available finalization action. Each summary area SHALL provide an editing affordance while the class is open, and choosing it SHALL open only that area's editor while preserving the operator's place. After an edit is saved the system SHALL refresh the summary and the readiness before finalization. The roster area SHALL present the active attendance as a compact table with one row per participant showing the participant, status, credited hours, adjustment, and row actions; a participant that needs attention SHALL be flagged in the row and SHALL remain compact until the operator opens that row. Removed attendance SHALL be presented behind a collapsed affordance only when a participant was removed.

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
- **THEN** the roster shows one compact row per participant with the name, status, credited hours, adjustment, and row actions

#### Scenario: Expand only the roster rows that need attention
- **WHEN** a participant has an invalid credit or a missing reporting context
- **THEN** that participant's row is flagged as needing attention while every row, including that one, stays compact

#### Scenario: Expand a flagged row on demand
- **WHEN** an operator opens a row that is flagged as needing attention
- **THEN** that row's detail is shown and the other rows stay compact

#### Scenario: Omit an empty removed-attendance affordance
- **WHEN** a class has no removed attendance
- **THEN** the workspace presents no removed-attendance affordance

### Requirement: Destination-specific finalization checks

The workspace SHALL show Mobile Training Unit usage only for a class whose selected destinations include the Mobile Training Unit, with exactly one editing surface for it. The MTU usage area SHALL summarise the recorded usage — the equipment, the supplies with their quantities, the transport with its mileage, and any free-text extras — and SHALL show that nothing is recorded when the usage is empty. For an MTU class, missing usage SHALL be reported as a readiness issue that opens the MTU usage editor, and recording the usage SHALL be part of the pre-finalization workspace. For a class whose destinations do not include the MTU the workspace SHALL NOT show MTU controls. Recording MTU usage SHALL NOT alter the finalized participant count or the revision number.

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
- **THEN** the MTU usage area summarises those recorded items in its summary line

#### Scenario: Show nothing recorded
- **WHEN** an MTU class has no recorded usage
- **THEN** the MTU usage area states that nothing is recorded

#### Scenario: Keep the finalized roster stable
- **WHEN** MTU usage is recorded and the class is finalized
- **THEN** the finalized participant count and revision number are unaffected by the MTU usage
