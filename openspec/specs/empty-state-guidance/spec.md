# empty-state-guidance Specification

## Purpose
Give every staff and public empty state one consistent presentation that explains what the absence means and offers a next step when one exists, so operators are never left to guess.
## Requirements
### Requirement: Empty states share one presentation primitive

The system SHALL render every major empty state through a single shared presentation component that supports an optional icon, a title, an optional explanatory description, and an optional action.

#### Scenario: Render an empty section through the shared component
- **WHEN** a staff section or list has no items to show
- **THEN** its empty state is rendered through the shared empty-state component

#### Scenario: Render an empty public area through the shared component
- **WHEN** a public area has no items to show
- **THEN** its empty state is rendered through the same shared empty-state component

### Requirement: Empty states explain the absence

The system SHALL word each major empty state so it conveys what the absence means, not only that a list or section is empty.

#### Scenario: Explain a dashboard absence
- **WHEN** a dashboard section has no items
- **THEN** its message describes what the empty section means for the operator

#### Scenario: Explain a list absence
- **WHEN** a staff list has no records to show
- **THEN** its message describes what the absence means rather than only reporting an empty list

### Requirement: Empty states offer a next action when one exists

When the acting operator has a permitted action that would populate the empty area, the system SHALL present that action within the empty state; when no action is appropriate, the system SHALL present explanatory text alone.

#### Scenario: Offer a create action
- **WHEN** an operator can create the records that the empty area would show
- **THEN** the empty state presents the create action

#### Scenario: Offer to clear a filter
- **WHEN** the empty area is empty because an active search or filter excludes every record
- **THEN** the empty state presents an action to clear the search or filter

#### Scenario: Withhold an action for a reassurance
- **WHEN** the empty state reports that nothing requires attention
- **THEN** the empty state presents no action

### Requirement: Empty states remain concise

The system SHALL limit each empty state to a title and at most one short explanatory description, plus an optional action, so an empty section does not dominate its page.

#### Scenario: Keep an empty state short
- **WHEN** an empty state is rendered
- **THEN** it shows one title and at most one description line alongside any action

### Requirement: Empty states stay consistent across sections

The system SHALL use the shared empty-state component and the same title, description, and action structure across every staff section and the public directory.

#### Scenario: Compare two empty sections
- **WHEN** two different sections are empty
- **THEN** both use the shared component with the same structural pattern of title, optional description, and optional action

