## ADDED Requirements

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
