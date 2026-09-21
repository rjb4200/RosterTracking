## MODIFIED Requirements

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
