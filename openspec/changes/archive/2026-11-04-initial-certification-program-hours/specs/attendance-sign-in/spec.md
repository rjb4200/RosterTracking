## ADDED Requirements

### Requirement: Initial-certification attendance credits program hours

For an initial-certification program class, the system SHALL default each participant's credited hours to the program hours rather than a one-day scheduled duration. The existing per-participant credit adjustment controls SHALL remain available.

#### Scenario: Sign in to a program class

- **WHEN** a participant confirms attendance for an initial-certification program class
- **THEN** the attendance is credited with the program hours

#### Scenario: Adjust a participant's program credit

- **WHEN** an authorized operator reduces a participant's credited hours in the review workspace
- **THEN** the participant retains the adjusted hours instead of the full program hours
