## ADDED Requirements

### Requirement: The schedule editor sets a session's methods
While a class is open, the schedule editor SHALL let an operator set a session's KFS-1A method to any non-empty combination of CR, HO, and OL, presented as independent choices. A new session SHALL start from the method set of the class delivery methods. Changing one session's method SHALL NOT change another session's method. The editor SHALL reject saving a session with no method selected.

#### Scenario: Choose CR and HO for one session
- **WHEN** an operator sets a session's method to CR and HO
- **THEN** the session records both methods and the editor shows both choices selected

#### Scenario: Change one session without changing the others
- **WHEN** an operator changes one session's method
- **THEN** every other session keeps its recorded method

#### Scenario: Start a new session from the class default
- **WHEN** an operator adds a session to a class whose delivery methods are Classroom and Hands-On
- **THEN** the new session starts with CR and HO selected

#### Scenario: Reject an empty method selection
- **WHEN** an operator tries to save a session with no method selected
- **THEN** the editor rejects the save and asks for at least one method

### Requirement: The schedule editor enters session hours in 15-minute increments
While a class is open, the schedule editor SHALL let an operator enter a session's credited hours as hours and minutes in 15-minute increments. It SHALL derive the session end time from the start time and the entered duration, and SHALL present the session's duration in hours and minutes. The editor SHALL reject a credited duration that is not a whole 15-minute increment.

#### Scenario: Enter two hours and fifteen minutes
- **WHEN** an operator sets a session's duration to two hours and fifteen minutes
- **THEN** the session stores 2.25 credited hours and its end time is the start time plus two hours and fifteen minutes

#### Scenario: Present session hours in hours and minutes
- **WHEN** a session stores 2.5 credited hours
- **THEN** the schedule presents the duration as 2h 30m

#### Scenario: Reject a duration outside the quarter-hour cadence
- **WHEN** a session is submitted with a credited duration that is not a whole 15-minute increment
- **THEN** the editor rejects the save
