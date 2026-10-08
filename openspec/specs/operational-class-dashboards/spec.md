# Operational Class Dashboards Specification

## Purpose

Provide instructors and elevated staff with focused, role-appropriate views of the teaching work that requires action.

## Requirements

### Requirement: Instructor operational dashboard
The system SHALL provide assigned instructors a server-rendered dashboard with a primary Create Class action, today's classes, upcoming classes, and the lifecycle-specific actions available to them.

#### Scenario: Open an active roster
- **WHEN** an assigned instructor views an open class on the dashboard
- **THEN** the dashboard presents an Active class card with an action to open its roster

#### Scenario: Display student access
- **WHEN** an assigned instructor views an open class on the dashboard
- **THEN** the dashboard presents an accessible icon action to display the student sign-in QR code

### Requirement: Elevated staff dashboard includes teaching and oversight
The system SHALL provide Training Majors and Administrators an administrator dashboard with a personal teaching section and a department oversight section.

#### Scenario: View personal teaching work
- **WHEN** elevated staff view the administrator dashboard
- **THEN** they can see and act on classes assigned to them using the same lifecycle actions as instructors

#### Scenario: View department work
- **WHEN** elevated staff view the administrator dashboard
- **THEN** they can see department classes and overdue roster work across instructors

### Requirement: Overdue rosters receive role-scoped reminders
The system SHALL identify open classes whose final scheduled session ended more than 24 hours ago and show a persistent reminder only to every assigned instructor and elevated staff.

#### Scenario: Overdue open class
- **WHEN** an assigned instructor views an open class more than 24 hours after its final session ended
- **THEN** the dashboard identifies it as overdue and provides a Review and finalize action

#### Scenario: Do not expose unrelated overdue work
- **WHEN** a non-elevated instructor is not assigned to an overdue class
- **THEN** the dashboard does not show that reminder
