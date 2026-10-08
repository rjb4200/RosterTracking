## MODIFIED Requirements

### Requirement: Overdue rosters receive role-scoped reminders
The system SHALL identify open classes whose final scheduled session ended more than 24 hours ago and show a persistent reminder only to every assigned instructor and elevated staff.

#### Scenario: Overdue open class
- **WHEN** an assigned instructor views an open class more than 24 hours after its final session ended
- **THEN** the dashboard identifies it as overdue and provides a Review and finalize action

#### Scenario: Do not expose unrelated overdue work
- **WHEN** a non-elevated instructor is not assigned to an overdue class
- **THEN** the dashboard does not show that reminder
