## MODIFIED Requirements

### Requirement: Class lifecycle is controlled
The system SHALL represent open, completed, finalized, and cancelled class states. It SHALL present authorized operators lifecycle actions in plain operational language, close public sign-in and enter completed roster review when an open class finishes attendance, finalize a completed class only once its roster is ready, reopen a finalized class only with an authorized reason, and cancel a non-finalized class. A class SHALL be created in the open state and SHALL remain editable while it is open or completed, except where a lifecycle restriction expressly applies.

#### Scenario: Complete an open class
- **WHEN** authorized staff finish attendance for an open class
- **THEN** public sign-in closes and the class state changes to completed for roster review, whether or not the roster still needs correction

#### Scenario: Block finalization with roster errors
- **WHEN** authorized staff attempt to finalize a completed class whose roster has no active attendance, missing required reporting context, or credited hours outside the class scheduled total
- **THEN** the system keeps the class completed and reports the roster validation errors

#### Scenario: Edit an open class
- **WHEN** authorized staff change the course, site, host agency, reporting systems, sessions, or lead instructor of an open class
- **THEN** the system saves the change and the class remains open

#### Scenario: Edit a completed class
- **WHEN** authorized staff change the course, site, host agency, reporting systems, sessions, or lead instructor of a completed class that is under roster review
- **THEN** the system saves the change and the class remains completed

#### Scenario: Lock finalized class editing
- **WHEN** a class is finalized
- **THEN** normal class and roster edits are rejected until an authorized reopen occurs

#### Scenario: Reopen a finalized class
- **WHEN** authorized staff provide a non-empty reopen reason
- **THEN** the class leaves finalized state and retains the reason and prior finalization history

#### Scenario: Cancel a class
- **WHEN** authorized staff cancel an open or completed class with a reason
- **THEN** the class state changes to cancelled and the reason is retained
