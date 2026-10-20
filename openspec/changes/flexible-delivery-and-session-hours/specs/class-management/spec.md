## MODIFIED Requirements

### Requirement: Class records use reference data
The system SHALL let authorized staff create an open class with a class name, a non-empty set of delivery methods drawn from Classroom, Hands-On, and Online, a required training site, selected reporting systems, an initial scheduled session, and an assigned lead instructor. The class name SHALL be the first Fire subject's class name when Fire is selected, or the EMS course name when KBEMS is selected. A class SHALL retain references to its selected catalog records for training sites and training codes rather than copied free-text values. Every class SHALL reference one active training site regardless of its delivery methods, and the delivery methods SHALL NOT affect whether a training site is required.

#### Scenario: Create a classroom class
- **WHEN** authorized staff enter a class name, select Classroom delivery, a training site, a scheduled session, a lead instructor, and reporting systems
- **THEN** the system creates an open class with those selections

#### Scenario: Create a class with multiple delivery methods
- **WHEN** authorized staff enter a class name, select Classroom and Hands-On delivery, a training site, a scheduled session, a lead instructor, and reporting systems
- **THEN** the system creates an open class carrying both delivery methods

#### Scenario: Require a site for every class
- **WHEN** staff attempt to create or save a class without a training site
- **THEN** the system rejects the change with a site-required validation error

#### Scenario: Use a site for an online class
- **WHEN** authorized staff select Online delivery and choose a site named Online
- **THEN** the system creates the class with that site

#### Scenario: Reject an empty delivery set
- **WHEN** staff attempt to create or save a class with no delivery method selected
- **THEN** the system rejects the change and asks for at least one delivery method

#### Scenario: Migrate historical delivery values
- **WHEN** the delivery-method migration runs against existing classes
- **THEN** it converts `in_person` to `classroom`, `virtual` to `online`, and `hybrid` to `classroom,online`

### Requirement: Class components retain scheduled sessions
The system SHALL let authorized staff add one or more components to a draft class. Each component SHALL store an optional session title, a scheduled start time normalized to a 15-minute increment, a scheduled end time derived from the selected start time and credited hours, and its credited hours. Each session start time SHALL be entered on a 15-minute cadence and SHALL default to the nearest quarter hour. A session start time that is not a whole 15-minute increment SHALL be rounded to the nearest one, which may roll to the next hour or the next day. Session credited hours SHALL be entered as hours and minutes in 15-minute increments. A newly added component SHALL default to two credited hours. The session title SHALL identify the session in staff scheduling and SHALL fall back to the class name when no title is provided for official roster output.

#### Scenario: Add multiple sessions
- **WHEN** staff add separate morning and afternoon components to a draft class
- **THEN** both components are retained in their scheduled order

#### Scenario: Default a new session duration
- **WHEN** staff add a new class component
- **THEN** the component starts with two credited hours and its end time is calculated from its selected start time plus those hours

#### Scenario: Calculate the end time from credited hours
- **WHEN** staff select a component start time and change its credited hours
- **THEN** the system recalculates and stores the end time as the start time plus the credited-hour duration

#### Scenario: Enter credited hours in quarter-hour steps
- **WHEN** staff set a component's credited hours to two hours and fifteen minutes
- **THEN** the system stores 2.25 credited hours and derives the end time as the start time plus two hours and fifteen minutes

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

## REMOVED Requirements

### Requirement: A session's KFS-1A method follows the class delivery method
**Reason**: Replaced by a per-session method set that defaults from the class delivery methods and can be changed independently.
**Migration**: Existing sessions keep their recorded method. New sessions inherit the class delivery default. Legacy `hybrid` reads as CR and OL.

## ADDED Requirements

### Requirement: A session's KFS-1A method defaults from the class delivery method
The system SHALL default every session's KFS-1A Method to the union of the method codes represented by the class delivery methods: Classroom marks CR, Hands-On marks HO, and Online marks OL. The class delivery methods SHALL form a non-empty set. Staff SHALL be able to change a session's Method to any non-empty combination of CR, HO, and OL independently of the class delivery methods. When staff change the delivery methods of an open class, the system SHALL update only those sessions whose Method still equals the previous default; sessions whose Method already differs SHALL retain their Method.

#### Scenario: Derive the method at class creation
- **WHEN** staff create a class with Classroom and Hands-On delivery and one or more Fire subjects
- **THEN** each created session stores CR and HO as its KFS-1A method

#### Scenario: Mark any method combination
- **WHEN** staff set a session's method to CR and HO
- **THEN** the session stores both CR and HO

#### Scenario: Override one session independently
- **WHEN** staff change one session's method to HO while its class uses Classroom delivery
- **THEN** that session's method is HO and every other session keeps its method

#### Scenario: Preserve an overridden session when delivery changes
- **WHEN** staff change the class delivery methods and a session's method already differs from the previous default
- **THEN** that session keeps its method while sessions still on the previous default are updated

#### Scenario: Follow the new default for inherited sessions
- **WHEN** staff change the class delivery methods and a session's method still equals the previous default
- **THEN** the session's method is updated to the new default

#### Scenario: Require at least one method
- **WHEN** staff attempt to save a session with no method selected
- **THEN** the system rejects the change and asks for at least one method

#### Scenario: Read a legacy hybrid method
- **WHEN** a session recorded the legacy `hybrid` method
- **THEN** the system presents it as CR and OL
