## MODIFIED Requirements

### Requirement: Class components retain scheduled sessions
The system SHALL let authorized staff add one or more components to a draft class. Each component SHALL store an optional session title, a scheduled start time normalized to a 15-minute increment, a scheduled end time derived from the selected start time and credited hours, and its credited hours. Each session start time SHALL be entered on a 15-minute cadence and SHALL default to the nearest quarter hour. A session start time that is not a whole 15-minute increment SHALL be rounded to the nearest one, which may roll to the next hour or the next day. A newly added component SHALL default to two credited hours. The session title SHALL identify the session in staff scheduling and SHALL fall back to the class course name when no title is provided for official roster output.

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
- **THEN** official roster output uses the class course name for the session-specific field

#### Scenario: Reject invalid component time range
- **WHEN** staff enter a component whose end time is not after its start time
- **THEN** the system rejects the component

### Requirement: Class creation is a stepped staff workflow
The system SHALL provide authorized staff a visibly stepped class-creation workflow that validates each stage before advancing, preserves entered values while navigating, and creates an open class only at final submission. The workflow's class start time SHALL default to the nearest quarter hour and SHALL be entered on a 15-minute cadence. A class start time that is not a whole 15-minute increment SHALL be rounded to the nearest one, visibly in the field and in the value the system stores, and the rounding may roll to the next hour or the next day.

#### Scenario: Review before creation
- **WHEN** staff finish the reporting step
- **THEN** the workflow presents a review of their selections before creating the class

#### Scenario: Create and open in one submission
- **WHEN** staff submit the reviewed workflow
- **THEN** the system creates the class already open and ready to accept student sign-in

#### Scenario: Default the class start time to the nearest quarter hour
- **WHEN** staff open the class-creation workflow and reach the class start time field
- **THEN** the field presents the nearest upcoming quarter hour as its starting value

#### Scenario: Round a typed class start time
- **WHEN** staff enter a class start time that is not a whole 15-minute increment, such as 09:07
- **THEN** the entered time rounds to the nearest 15-minute value, 09:00, and that rounded value is what the field shows and what is stored

#### Scenario: Keep a typed class start time on the cadence
- **WHEN** staff submit a class whose start time is not a whole 15-minute increment
- **THEN** the stored class start time is the nearest 15-minute value, regardless of how the value was supplied
