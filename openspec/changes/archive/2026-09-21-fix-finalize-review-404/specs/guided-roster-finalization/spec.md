## MODIFIED Requirements

### Requirement: Guided after-class roster review
The system SHALL provide authorized instructors and elevated staff a dedicated completed-class review screen that shows class summary, scheduled hours, active and removed attendance, credited hours, adjustment reasons, reporting readiness, and the finalization action. The review screen SHALL remain available after the class is finalized, presenting the finalized state and its locked revision instead of a not-found result. While a class is completed the review screen SHALL present roster-editing affordances; while it is finalized the review screen SHALL present the roster as read-only, SHALL omit roster-editing affordances, and SHALL present the reopen path.

#### Scenario: Review a completed class
- **WHEN** an authorized operator opens a completed class review
- **THEN** the system presents the class summary, all roster records, and the next required review actions in one workflow

#### Scenario: Identify a reporting exception
- **WHEN** an active attendance record lacks reporting-required context
- **THEN** the review identifies that record and blocks finalization until it is resolved or removed

#### Scenario: Remain on the review after finalizing
- **WHEN** an authorized operator finalizes a roster-ready completed class from its review screen
- **THEN** the review screen presents the finalized class and its locked revision instead of a not-found result

#### Scenario: Review a finalized class read-only
- **WHEN** an authorized operator opens the review screen for a finalized class
- **THEN** the system presents the class summary and roster as read-only, omits roster-editing actions, and offers the reopen path

#### Scenario: Reopen from the review screen
- **WHEN** an authorized operator supplies a reopen reason from the finalized review screen
- **THEN** the class returns to its editable lifecycle home without a not-found result and prior revisions remain retained
