# Class Management Specification

## Purpose

Allow authorized staff to create, schedule, open, complete, and cancel reusable training classes while preserving the reference data and audit trail needed by later attendance and reporting workflows.

## Requirements

### Requirement: Class records use reference data
The system SHALL let authorized staff create a draft class with a required course, delivery method, training site when applicable, and selected reporting systems. A class SHALL retain references to its selected catalog records rather than copied free-text values.

#### Scenario: Create an in-person draft
- **WHEN** authorized staff select a course, an in-person delivery method, a training site, and reporting systems
- **THEN** the system creates a draft class with those selections

#### Scenario: Require a site for an in-person class
- **WHEN** staff attempt to save an in-person class without a training site
- **THEN** the system rejects the draft with a site-required validation error

### Requirement: Class components retain scheduled sessions
The system SHALL let authorized staff add one or more components to a draft class. Each component SHALL store its scheduled start and end times and its credited hours.

#### Scenario: Add multiple sessions
- **WHEN** staff add separate morning and afternoon components to a draft class
- **THEN** both components are retained in their scheduled order

#### Scenario: Reject invalid component time range
- **WHEN** staff enter a component whose end time is not after its start time
- **THEN** the system rejects the component

### Requirement: Classes have assigned instructors
The system SHALL let authorized staff assign active staff users as instructors and identify at most one lead instructor for each class.

#### Scenario: Assign a lead instructor
- **WHEN** staff assign an active instructor as the lead instructor for a class
- **THEN** the instructor assignment is stored as the class lead

#### Scenario: Replace the lead instructor
- **WHEN** staff select a different instructor as the lead for the same class
- **THEN** the newly selected instructor becomes the only lead assignment

### Requirement: Class lifecycle is controlled
The system SHALL represent draft, open, completed, finalized, and cancelled class states. It SHALL allow authorized staff to open only a complete draft, complete an open class, and cancel a non-finalized class; finalization is reserved for the later finalization workflow.

#### Scenario: Open a complete draft
- **WHEN** staff open a draft with a course, required site, at least one component, and a lead instructor
- **THEN** the class state changes to open

#### Scenario: Block opening an incomplete draft
- **WHEN** staff attempt to open a draft missing a required class detail
- **THEN** the system keeps the class in draft and reports the missing detail

#### Scenario: Cancel a class
- **WHEN** authorized staff cancel a draft, open, or completed class with a reason
- **THEN** the class state changes to cancelled and the reason is retained

### Requirement: Class changes are audited
The system SHALL record audit events for class creation, component and instructor changes, reporting-system changes, and lifecycle transitions without recording sign-in token material.

#### Scenario: Record an opening transition
- **WHEN** a staff member opens a class
- **THEN** an audit event records the actor, class, prior state, new state, and server timestamp

### Requirement: Class creation is a stepped staff workflow
The system SHALL provide authorized staff a stepped class-creation workflow that saves drafts between steps and exposes validation before a class is opened.

#### Scenario: Resume a draft
- **WHEN** staff leave a partially configured class draft and return later
- **THEN** the workflow restores the saved selections and components
