## MODIFIED Requirements

### Requirement: Class lifecycle is controlled
The system SHALL represent draft, open, completed, finalized, and cancelled class states. It SHALL present authorized operators lifecycle actions in plain operational language, allow authorized staff to open only a complete draft, close public sign-in and enter completed roster review only when an open class passes completion validation, finalize a completed class through the finalization workflow, reopen a finalized class only with an authorized reason, and cancel a non-finalized class. Normal class and roster edits SHALL be rejected only after finalization, except where a lifecycle restriction expressly applies.

#### Scenario: Open a complete draft
- **WHEN** staff open a draft with a course, required site, at least one component, and a lead instructor
- **THEN** the class state changes to open

#### Scenario: Block opening an incomplete draft
- **WHEN** staff attempt to open a draft missing a required class detail
- **THEN** the system keeps the class in draft and reports the missing detail

#### Scenario: Enter completed roster review
- **WHEN** authorized staff close an open class with at least one active attendance record and no active attendance missing required reporting context or valid credited hours
- **THEN** public sign-in closes and the class state changes to completed for roster review

#### Scenario: Block completion with roster errors
- **WHEN** authorized staff attempt to complete an open class whose roster has no active attendance, missing required reporting context, or credited hours outside the class scheduled total
- **THEN** the system keeps the class open and reports the roster validation errors

#### Scenario: Lock finalized class editing
- **WHEN** a class is finalized
- **THEN** normal class and roster edits are rejected until an authorized reopen occurs

#### Scenario: Reopen a finalized class
- **WHEN** authorized staff provide a non-empty reopen reason
- **THEN** the class leaves finalized state and retains the reason and prior finalization history

#### Scenario: Cancel a class
- **WHEN** authorized staff cancel a draft, open, or completed class with a reason
- **THEN** the class state changes to cancelled and the reason is retained
