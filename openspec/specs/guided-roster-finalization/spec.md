# Guided Roster Finalization Specification

## Purpose

Give instructors one focused after-class screen for reconciling attendance and deliberately creating a locked final roster.

## Requirements

### Requirement: Guided after-class roster review
The system SHALL provide authorized instructors and elevated staff a dedicated completed-class review screen that shows class summary, scheduled hours, active and removed attendance, credited hours, adjustment reasons, reporting readiness, and the finalization action.

#### Scenario: Review a completed class
- **WHEN** an authorized operator opens a completed class review
- **THEN** the system presents the class summary, all roster records, and the next required review actions in one workflow

#### Scenario: Identify a reporting exception
- **WHEN** an active attendance record lacks reporting-required context
- **THEN** the review identifies that record and blocks finalization until it is resolved or removed

### Requirement: Guided credit adjustment reasons
The review workflow SHALL offer Late Arrival, Left Early, Partial Attendance, Instructor Adjustment, and Other as adjustment reasons. Other SHALL require an operator-supplied explanation.

#### Scenario: Select a standard adjustment reason
- **WHEN** an operator changes credited hours below the scheduled total and selects Left Early
- **THEN** the system records Left Early as the adjustment reason

#### Scenario: Explain another adjustment
- **WHEN** an operator selects Other for an adjusted credit value
- **THEN** the system requires a non-empty explanation before saving the adjustment
