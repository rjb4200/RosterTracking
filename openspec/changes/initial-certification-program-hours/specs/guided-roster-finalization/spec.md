## ADDED Requirements

### Requirement: Initial-certification review presents program hours

For an open initial-certification class, the review workspace SHALL present the selected program and its fixed hours instead of a one-day session duration. It SHALL NOT offer the duration picker for the program block. Participant credit adjustments SHALL remain available up to the program hours.

#### Scenario: Review an initial-certification program

- **WHEN** an authorized operator opens the review workspace for an AEMT program class
- **THEN** the workspace shows AEMT and 190 program hours rather than a one-day duration

#### Scenario: Adjust participant credit within the program

- **WHEN** an operator adjusts a participant's credited hours
- **THEN** the value remains bounded by the program hours
