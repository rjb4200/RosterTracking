## MODIFIED Requirements

### Requirement: Class lifecycle is controlled
The system SHALL represent draft, open, completed, finalized, and cancelled class states. It SHALL allow authorized staff to open only a complete draft, complete an open class only when its roster passes completion validation, and cancel a non-finalized class; finalization is reserved for the later finalization workflow.

#### Scenario: Open a complete draft
- **WHEN** staff open a draft with a course, required site, at least one component, and a lead instructor
- **THEN** the class state changes to open

#### Scenario: Block opening an incomplete draft
- **WHEN** staff attempt to open a draft missing a required class detail
- **THEN** the system keeps the class in draft and reports the missing detail

#### Scenario: Complete a roster-ready class
- **WHEN** authorized staff complete an open class with at least one active attendance record and no active attendance missing required reporting context or valid credited hours
- **THEN** the class state changes to completed

#### Scenario: Block completion with roster errors
- **WHEN** authorized staff attempt to complete an open class whose roster has no active attendance, missing required reporting context, or credited hours outside the class scheduled total
- **THEN** the system keeps the class open and reports the roster validation errors

#### Scenario: Cancel a class
- **WHEN** authorized staff cancel a draft, open, or completed class with a reason
- **THEN** the class state changes to cancelled and the reason is retained
