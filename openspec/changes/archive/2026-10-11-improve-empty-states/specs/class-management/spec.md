## ADDED Requirements

### Requirement: Class list empty states guide the operator

The system SHALL explain an empty class list and offer the create-class action when no class exists at all, offer to clear the filters or search when those exclude every class, and confirm that no finalized classes are available without offering an action when the finalized section is empty.

#### Scenario: No classes exist
- **WHEN** the class list is empty because no classes exist
- **THEN** the list explains that no classes exist yet and offers the create-class action

#### Scenario: Filters exclude every class
- **WHEN** the class list is empty because the active filters or search exclude every class
- **THEN** the list offers to clear the filters or search

#### Scenario: No finalized classes
- **WHEN** the finalized classes section is empty
- **THEN** the section confirms that no finalized classes are available and offers no action
