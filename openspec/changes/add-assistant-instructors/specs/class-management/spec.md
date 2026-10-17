## ADDED Requirements

### Requirement: A class may have an assistant instructor
The system SHALL allow a class to have at most one assistant instructor and SHALL let authorized staff add, change, or remove the assistant instructor while the class is open. Adding or changing the assistant SHALL NOT change the lead instructor, and an instructor SHALL NOT hold both roles.

#### Scenario: Add an assistant instructor to an open class
- **WHEN** authorized staff choose an active staff member who is not the lead as the assistant instructor for an open class
- **THEN** the class records that instructor as its assistant instructor and keeps the current lead instructor unchanged

#### Scenario: Change the assistant instructor
- **WHEN** authorized staff choose a different instructor as the assistant instructor
- **THEN** the class records the newly chosen instructor as its only assistant instructor

#### Scenario: Remove the assistant instructor
- **WHEN** authorized staff clear the assistant instructor for an open class
- **THEN** the class is left with its lead instructor and no assistant instructor

#### Scenario: Reject the lead as the assistant
- **WHEN** authorized staff choose the current lead instructor as the assistant instructor
- **THEN** the system rejects the change and keeps the lead and assistant roles distinct

#### Scenario: Vacate the assistant slot when the assistant becomes the lead
- **WHEN** authorized staff select the current assistant instructor as the lead instructor
- **THEN** the selected instructor becomes the only lead and the class has no assistant instructor

### Requirement: Fire reporting and instructor changes require a fire instructor
When authorized staff add the Fire reporting system to a class, or change its assigned lead or assistant instructors while Fire is selected, the system SHALL ensure the class retains at least one assigned instructor who is a fire instructor — a staff member with both a valid FFN (`0000-0000`) and a Fire Instructor certification level (1, 2, or 3) — and SHALL reject the change otherwise. This SHALL prevent bypassing the Fire class guard through an edit.

#### Scenario: Reject adding Fire with no fire instructor
- **WHEN** staff add the Fire reporting system to a class whose assigned instructors include no fire instructor
- **THEN** the system rejects the change and identifies that a fire instructor is required

#### Scenario: Reject removing the only fire instructor
- **WHEN** staff change or remove the assigned instructor who is the class's only fire instructor while Fire is selected
- **THEN** the system rejects the change and identifies that a fire instructor is required

#### Scenario: Allow a change that keeps a fire instructor
- **WHEN** staff change the assigned lead or assistant instructors such that at least one assigned instructor remains a fire instructor
- **THEN** the system saves the change

## MODIFIED Requirements

### Requirement: Classes have assigned instructors
The system SHALL let authorized staff assign active staff users as instructors and identify at most one lead instructor and at most one assistant instructor for each class.

#### Scenario: Assign a lead instructor
- **WHEN** staff assign an active instructor as the lead instructor for a class
- **THEN** the instructor assignment is stored as the class lead

#### Scenario: Replace the lead instructor
- **WHEN** staff select a different instructor as the lead for the same class
- **THEN** the newly selected instructor becomes the only lead assignment

#### Scenario: Assign an assistant instructor
- **WHEN** staff assign an active instructor other than the lead as the assistant instructor for a class
- **THEN** the instructor assignment is stored as the class assistant instructor

### Requirement: Class lifecycle is controlled
The system SHALL represent open, finalized, and cancelled class states. It SHALL present authorized operators lifecycle actions in plain operational language, finalize an open class only once its roster is ready and only by its signing instructor, reopen a finalized class only with an authorized reason, and cancel a non-finalized class. A class SHALL be created in the open state and SHALL remain editable while it is open, except where a lifecycle restriction expressly applies.

#### Scenario: Finalize an open class
- **WHEN** the class's signing instructor finalizes a roster-ready open class
- **THEN** public sign-in closes, the class state changes to finalized, and the roster is locked in the same action

#### Scenario: Block finalization with roster errors
- **WHEN** the signing instructor attempts to finalize an open class whose roster has no active attendance, missing required reporting context, or credited hours outside the class scheduled total
- **THEN** the system keeps the class open, leaves public sign-in unchanged, and reports the roster validation errors

#### Scenario: Edit an open class
- **WHEN** authorized staff change the course, site, host agency, reporting systems, sessions, lead instructor, or assistant instructor of an open class
- **THEN** the system saves the change and the class remains open

#### Scenario: Lock finalized class editing
- **WHEN** a class is finalized
- **THEN** normal class and roster edits are rejected until an authorized reopen occurs

#### Scenario: Reopen a finalized class
- **WHEN** authorized staff provide a non-empty reopen reason
- **THEN** the class leaves finalized state, returns to open, and retains the reason and prior finalization history

#### Scenario: Cancel a class
- **WHEN** authorized staff cancel an open class with a reason
- **THEN** the class state changes to cancelled and the reason is retained

## REMOVED Requirements

### Requirement: Fire reporting and instructor changes require valid FFNs
**Reason**: Replaced by the requirement that a Fire class retain at least one fire instructor, so a class may be led by an instructor who is not a fire instructor when a fire-qualified assistant is present.
**Migration**: Use "Fire reporting and instructor changes require a fire instructor".
