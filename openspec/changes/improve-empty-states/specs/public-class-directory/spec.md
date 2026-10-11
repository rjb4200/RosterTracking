## ADDED Requirements

### Requirement: Empty directory orients the visitor

The system SHALL present an explanatory message when no class is open for sign-in, describing that classes appear here when an instructor opens them, and SHALL NOT present any staff action to a visitor.

#### Scenario: No class is open for sign-in
- **WHEN** a visitor opens the public landing page and no class is within the display window
- **THEN** the directory explains that no class is open for sign-in, states that classes appear here when opened, and offers no action
