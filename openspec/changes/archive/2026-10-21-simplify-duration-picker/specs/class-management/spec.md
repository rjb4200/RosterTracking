## MODIFIED Requirements

### Requirement: Class components retain scheduled sessions
The system SHALL let authorized staff add one or more components to a draft class. Each component SHALL store an optional session title, a scheduled start time normalized to a 15-minute increment, a scheduled end time derived from the selected start time and credited hours, and its credited hours. Each session start time SHALL be entered on a 15-minute cadence and SHALL default to the nearest quarter hour. A session start time that is not a whole 15-minute increment SHALL be rounded to the nearest one, which may roll to the next hour or the next day. Session credited hours SHALL be entered through a single duration selection that offers every 15-minute value from 30 minutes through 16 hours, presented as hours and minutes. A newly added component SHALL default to two credited hours. When a component's stored credited hours fall outside the offered range, the selection SHALL also offer that current value so an edit does not change it unless staff choose another. The session title SHALL identify the session in staff scheduling and SHALL fall back to the class name when no title is provided for official roster output.

#### Scenario: Add multiple sessions
- **WHEN** staff add separate morning and afternoon components to a draft class
- **THEN** both components are retained in their scheduled order

#### Scenario: Default a new session duration
- **WHEN** staff add a new class component
- **THEN** the component starts with two credited hours and its end time is calculated from its selected start time plus those hours

#### Scenario: Calculate the end time from credited hours
- **WHEN** staff select a component start time and change its credited hours
- **THEN** the system recalculates and stores the end time as the start time plus the credited-hour duration

#### Scenario: Choose credited hours from the combined selection
- **WHEN** staff select 2h 15m from a component's duration selection
- **THEN** the component stores 2.25 credited hours and derives the end time as the start time plus two hours and fifteen minutes

#### Scenario: Enter credited hours in quarter-hour steps
- **WHEN** staff set a component's credited hours to two hours and fifteen minutes
- **THEN** the system stores 2.25 credited hours and derives the end time as the start time plus two hours and fifteen minutes

#### Scenario: Keep an out-of-range current duration
- **WHEN** staff edit a component whose stored credited hours are 15m
- **THEN** the duration selection includes 15m as the current value and saving without changing it preserves those credited hours

#### Scenario: Reject a duration outside the quarter-hour cadence
- **WHEN** a component is submitted with a credited duration that is not a whole 15-minute increment
- **THEN** the system rejects the component

#### Scenario: Restrict session start times
- **WHEN** staff select a component start time
- **THEN** the system permits only times at :00, :15, :30, or :45 past the hour

#### Scenario: Round a typed session start time
- **WHEN** staff enter a component start time that is not a whole 15-minute increment, such as 09:07
- **THEN** the entered time is rounded to the nearest 15-minute value, 09:00, and that rounded time is what the field shows and what is stored

#### Scenario: Roll a rounded session start time forward
- **WHEN** rounding pushes a session start past the end of the day
- **THEN** the rounded start is the next day at the earliest time on the cadence

#### Scenario: Use a session title in official output
- **WHEN** staff provide a session title and finalize a class
- **THEN** official roster output uses that title for the session-specific field

#### Scenario: Fall back when a session title is omitted
- **WHEN** staff leave a session title blank and finalize a class
- **THEN** official roster output uses the class name for the session-specific field

#### Scenario: Reject invalid component time range
- **WHEN** staff enter a component whose end time is not after its start time
- **THEN** the system rejects the component
