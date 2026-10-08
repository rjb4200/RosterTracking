## MODIFIED Requirements

### Requirement: Public directory lists only open classes
The system SHALL present a public landing-page directory containing only classes that are in the open state and whose first scheduled session is within the display window. It SHALL list a class starting 18 hours before its first scheduled session and SHALL stop listing it 36 hours after its first scheduled session. Each entry SHALL disclose only the class name, next scheduled session date and time, in-person site name or `Virtual` delivery label, and assigned instructor names formatted as first initial plus last name.

#### Scenario: View classes inside the display window
- **WHEN** a visitor opens the public landing page while an open class's first session is within the display window
- **THEN** the visitor sees that class and no class outside the window or in a non-open state

#### Scenario: Hide a future class outside the window
- **WHEN** an open class's first scheduled session is more than 18 hours away
- **THEN** the class is not listed in the public directory

#### Scenario: Hide a class after the window closes
- **WHEN** more than 36 hours have passed since an open class's first scheduled session
- **THEN** the class is not listed in the public directory

#### Scenario: View an open virtual class
- **WHEN** an open class within the window has virtual delivery
- **THEN** its public entry displays `Virtual` instead of a training-site name
