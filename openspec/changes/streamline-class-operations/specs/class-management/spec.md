## MODIFIED Requirements

### Requirement: Class records use reference data
The system SHALL let authorized staff create an open class with a required course, one of the Classroom, Hands-On, Online, or Hybrid delivery methods, a training site when applicable, selected reporting systems, an initial scheduled session, and an assigned lead instructor. A class SHALL retain references to its selected catalog records rather than copied free-text values. Classroom, Hands-On, and Hybrid classes SHALL require a training site; Online classes SHALL permit no training site.

#### Scenario: Create a classroom class
- **WHEN** authorized staff select a course, Classroom delivery, a training site, a scheduled session, a lead instructor, and reporting systems
- **THEN** the system creates an open class with those selections

#### Scenario: Require a site for site-based delivery
- **WHEN** staff attempt to create or save a Classroom, Hands-On, or Hybrid class without a training site
- **THEN** the system rejects the change with a site-required validation error

#### Scenario: Create an online class without a site
- **WHEN** authorized staff select Online delivery without a training site
- **THEN** the system permits the class to be created

#### Scenario: Migrate historical delivery values
- **WHEN** the delivery-method migration runs against existing classes
- **THEN** it converts `in_person` to `classroom`, `virtual` to `online`, and retains `hybrid` as `hybrid`

### Requirement: Class lifecycle is controlled
The system SHALL represent open, completed, finalized, and cancelled class states. It SHALL present authorized operators lifecycle actions in plain operational language, close public sign-in and enter completed roster review only when an open class passes completion validation, finalize a completed class through the finalization workflow, reopen a finalized class only with an authorized reason, and cancel a non-finalized class. A class SHALL be created in the open state and SHALL remain editable until it is finalized, except where a lifecycle restriction expressly applies.

#### Scenario: Complete an open class
- **WHEN** authorized staff finish attendance for an open class with at least one active attendance record and no active attendance missing required reporting context or valid credited hours
- **THEN** public sign-in closes and the class state changes to completed for roster review

#### Scenario: Block completion with roster errors
- **WHEN** authorized staff attempt to complete an open class whose roster has no active attendance, missing required reporting context, or credited hours outside the class scheduled total
- **THEN** the system keeps the class open and reports the roster validation errors

#### Scenario: Edit an open class
- **WHEN** authorized staff change the course, site, host agency, reporting systems, sessions, or lead instructor of an open class
- **THEN** the system saves the change and the class remains open

#### Scenario: Lock finalized class editing
- **WHEN** a class is finalized
- **THEN** normal class and roster edits are rejected until an authorized reopen occurs

#### Scenario: Reopen a finalized class
- **WHEN** authorized staff provide a non-empty reopen reason
- **THEN** the class leaves finalized state and retains the reason and prior finalization history

#### Scenario: Cancel a class
- **WHEN** authorized staff cancel an open or completed class with a reason
- **THEN** the class state changes to cancelled and the reason is retained

### Requirement: Class creation is a stepped staff workflow
The system SHALL provide authorized staff a visibly stepped class-creation workflow that validates each stage before advancing, preserves entered values while navigating, and creates an open class only at final submission.

#### Scenario: Review before creation
- **WHEN** staff finish the reporting step
- **THEN** the workflow presents a review of their selections before creating the class

#### Scenario: Create and open in one submission
- **WHEN** staff submit the reviewed workflow
- **THEN** the system creates the class already open and ready to accept student sign-in
