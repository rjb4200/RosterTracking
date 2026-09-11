## MODIFIED Requirements

### Requirement: Class components retain scheduled sessions
The system SHALL let authorized staff add one or more components to a draft class. Each component SHALL store an optional session title, a scheduled start time selected in 15-minute increments, a scheduled end time derived from the selected start time and credited hours, and its credited hours. A newly added component SHALL default to two credited hours. The session title SHALL identify the session in staff scheduling and SHALL fall back to the class course name when no title is provided for official roster output.

#### Scenario: Add multiple sessions
- **WHEN** staff add separate morning and afternoon components to a draft class
- **THEN** both components are retained in their scheduled order

#### Scenario: Default a new session duration
- **WHEN** staff add a new class component
- **THEN** the component starts with two credited hours and its end time is calculated from its selected start time plus those hours

#### Scenario: Calculate the end time from credited hours
- **WHEN** staff select a component start time and change its credited hours
- **THEN** the system recalculates and stores the end time as the start time plus the credited-hour duration

#### Scenario: Restrict session start times
- **WHEN** staff select a component start time
- **THEN** the system permits only times at :00, :15, :30, or :45 past the hour

#### Scenario: Use a session title in official output
- **WHEN** staff provide a session title and finalize a class
- **THEN** official roster output uses that title for the session-specific field

#### Scenario: Fall back when a session title is omitted
- **WHEN** staff leave a session title blank and finalize a class
- **THEN** official roster output uses the class course name for the session-specific field

#### Scenario: Reject invalid component time range
- **WHEN** staff enter a component whose end time is not after its start time
- **THEN** the system rejects the component
