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

### Requirement: Dashboard sections guide when empty

The system SHALL explain each empty dashboard section rather than only stating that it is empty, and SHALL surface the operator's next upcoming assigned class in the today section when they have no class today and an upcoming class.

#### Scenario: Show the next class in an empty today section
- **WHEN** an assigned instructor has no class scheduled today but has an upcoming class
- **THEN** the today section states that there are no classes today and names the next upcoming class with its date and time

#### Scenario: Confirm nothing overdue
- **WHEN** an assigned instructor has no overdue roster
- **THEN** the overdue section confirms that nothing is awaiting finalization and offers no action

#### Scenario: Offer class creation when no upcoming work exists
- **WHEN** an operator has no upcoming classes
- **THEN** the upcoming section offers the create-class action

#### Scenario: Confirm no department work needs attention
- **WHEN** elevated staff have no department classes needing attention
- **THEN** the oversight section confirms that nothing needs attention and offers no action

### Requirement: The dashboard lists pending finalize and sign actions

The system SHALL list each class that requires the operator's action on that operator's dashboard, naming the class and the action: finalize for an open class the operator leads, or sign a named document scope for a finalized class whose scope is pending and for which the operator is the required signer. The system SHALL NOT offer the action to an operator who is not the responsible signer. The dashboard SHALL distinguish a pending signature from an unfinalized class.

#### Scenario: Lead sees an open class to finalize
- **WHEN** the class lead opens their dashboard
- **THEN** the dashboard lists each open class they lead with the finalize action

#### Scenario: Fire signer sees a pending Fire scope
- **WHEN** the Fire signer opens their dashboard
- **THEN** the dashboard lists each finalized class whose `fire` scope is pending with the Fire sign action

#### Scenario: Non-signer does not see the sign action
- **WHEN** an assigned instructor who is not the pending scope's signer opens their dashboard
- **THEN** the dashboard does not offer them that scope's sign action

#### Scenario: Distinguish pending from open
- **WHEN** the dashboard lists a finalized class with a pending scope
- **THEN** it identifies the class as finalized and the item as a signature request rather than a finalization request

