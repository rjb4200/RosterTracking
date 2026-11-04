# Spec Delta

## MODIFIED Requirements

### Requirement: Class components retain scheduled sessions
The system SHALL let authorized staff add one or more ordered subject components to a class. A class SHALL have one start time normalized to a 15-minute increment. Each subject SHALL store an optional title, a credited duration selected from 15-minute values from 30 minutes through 16 hours, and its position. The first subject SHALL start at the class start; each later subject SHALL start at the previous subject's end without a gap. The system SHALL derive each subject's end time from its start and duration. The class scheduled total SHALL be the sum of subject durations. A new subject SHALL default to two credited hours. A stored duration outside the offered range SHALL remain selectable so an edit does not change it unless staff choose another. The subject title SHALL identify the subject and SHALL fall back to the class name in official roster output.

#### Scenario: Add multiple sessions
- **WHEN** staff add a second subject component to a class
- **THEN** both subjects are retained in scheduled order with the second start derived from the first subject's end

#### Scenario: Default a new session duration
- **WHEN** staff add a new subject component
- **THEN** the subject starts with two credited hours and its end time is derived from its start time plus those hours

#### Scenario: Calculate the end time from credited hours
- **WHEN** staff change a subject's credited hours
- **THEN** the system recalculates that subject's end time and every later subject's start and end

#### Scenario: Choose credited hours from the combined selection
- **WHEN** staff select 2h 15m from a subject's duration selection
- **THEN** the subject stores 2.25 credited hours and its end time is derived from its start time plus two hours and fifteen minutes

#### Scenario: Enter credited hours in quarter-hour steps
- **WHEN** staff set a subject's credited hours to two hours and fifteen minutes
- **THEN** the system stores 2.25 credited hours and derives the end time from its start time plus two hours and fifteen minutes

#### Scenario: Keep an out-of-range current duration
- **WHEN** staff edit a subject whose stored credited hours are 15m
- **THEN** the duration selection includes 15m as the current value and saving without changing it preserves those credited hours

#### Scenario: Reject a duration outside the quarter-hour cadence
- **WHEN** a subject is submitted with a credited duration that is not a whole 15-minute increment
- **THEN** the system rejects the subject

#### Scenario: Restrict session start times
- **WHEN** staff select the class start time
- **THEN** the system permits only times at :00, :15, :30, or :45 past the hour

#### Scenario: Round a typed session start time
- **WHEN** staff enter a class start time that is not a whole 15-minute increment, such as 09:07
- **THEN** the entered time is rounded to the nearest 15-minute value, 09:00, and that rounded time is what the field shows and what is stored

#### Scenario: Roll a rounded session start time forward
- **WHEN** rounding pushes the class start past the end of the day
- **THEN** the rounded start is the next day at the earliest time on the cadence

#### Scenario: Use a session title in official output
- **WHEN** staff provide a subject title and finalize a class
- **THEN** official roster output uses that title for the subject-specific field

#### Scenario: Fall back when a session title is omitted
- **WHEN** staff leave a subject title blank and finalize a class
- **THEN** official roster output uses the class name for the subject-specific field

#### Scenario: Reject invalid component time range
- **WHEN** a subject is submitted without a positive credited duration
- **THEN** the system rejects the subject

#### Scenario: Derive sequential times
- **WHEN** a class starts at 11:00 with a 1.5-hour first subject and a 0.5-hour second subject
- **THEN** the first subject runs from 11:00 to 12:30 and the second runs from 12:30 to 13:00

#### Scenario: Sum the class total
- **WHEN** a class has a 1.5-hour first subject and a 0.5-hour second subject
- **THEN** the class scheduled total is 2.0 hours

#### Scenario: No gap between subjects
- **WHEN** staff save sequential subject durations
- **THEN** each later subject starts at the previous subject's end and no gap is stored

### Requirement: A session's KFS-1A method defaults from the class delivery method
The system SHALL store one method set for the class, derived from the class delivery methods: Classroom marks CR, Hands-On marks HO, and Online marks OL. The class delivery methods SHALL form a non-empty set. Every subject SHALL use the class method set for official output. Staff SHALL NOT set an independent method for an individual subject. When staff change the delivery methods of an open class, every subject's method SHALL update to the new set.

#### Scenario: Derive the method at class creation
- **WHEN** staff create a class with Classroom and Hands-On delivery and one or more subjects
- **THEN** every created subject stores CR and HO as its KFS-1A method

#### Scenario: Mark any method combination
- **WHEN** staff set the class method set to CR and HO
- **THEN** every subject stores both CR and HO

#### Scenario: Override one session independently
- **WHEN** staff edit a single subject
- **THEN** the system does not offer an independent method for that subject and every subject uses the class method set

#### Scenario: Preserve an overridden session when delivery changes
- **WHEN** staff change the class delivery methods
- **THEN** no subject keeps an independent method and every subject updates to the new class method set

#### Scenario: Follow the new default for inherited sessions
- **WHEN** staff change the class delivery methods
- **THEN** every subject's method is the new class method set

#### Scenario: Require at least one method
- **WHEN** staff attempt to save a class with no delivery method selected
- **THEN** the system rejects the change and asks for at least one method

#### Scenario: Read a legacy hybrid method
- **WHEN** a subject recorded the legacy `hybrid` method
- **THEN** the system presents it as CR and OL
