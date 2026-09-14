## MODIFIED Requirements

### Requirement: Class lifecycle is controlled
The system SHALL represent draft, open, completed, finalized, and cancelled class states. It SHALL present authorized operators lifecycle actions in plain operational language, allow authorized staff to open only a complete draft, complete an open class only when its roster passes completion validation, finalize a completed class through the finalization workflow, reopen a finalized class only with an authorized reason, and cancel a non-finalized class.

#### Scenario: Finish an active class
- **WHEN** an operator selects the action to finish attendance and review an active class
- **THEN** the system applies existing roster-completion validation before changing the class to completed

#### Scenario: Block completion with roster errors
- **WHEN** an operator attempts to finish an open class whose roster has no active attendance, missing required reporting context, or credited hours outside the class scheduled total
- **THEN** the system keeps the class open and reports the roster validation errors
