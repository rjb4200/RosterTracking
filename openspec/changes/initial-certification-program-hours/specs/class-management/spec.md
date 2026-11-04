## MODIFIED Requirements

### Requirement: Class sessions share a roster day

The system SHALL require every scheduled component of a class to occur on the same department-calendar day so one class has one roster for one day while retaining multiple subject sessions. An initial-certification program class SHALL be exempt and MAY use one program block that spans multiple department-calendar days.

#### Scenario: Add subjects on one day

- **WHEN** staff add multiple subject sessions on the same department-calendar day
- **THEN** the class retains the sessions under one class roster

#### Scenario: Reject a session on another day

- **WHEN** staff add or update a session whose department-calendar date differs from the class's existing sessions
- **THEN** the system rejects the session with a single-day roster validation error

#### Scenario: Allow an initial-certification program block to span days

- **WHEN** staff create an initial-certification program class whose program block ends on a later department-calendar day
- **THEN** the system accepts the program block

## ADDED Requirements

### Requirement: Initial-certification program class

The system SHALL store the selected initial-certification program on the class and SHALL represent the program as one program block whose credited hours equal the program hours. The program block SHALL be the class total and the default source of participant credit. The class SHALL remain KBEMS-only.

#### Scenario: Store the program and hours

- **WHEN** staff create an EMT-B initial-certification class
- **THEN** the class stores the EMT-B program and one 160-hour program block

#### Scenario: Default participant credit from the program

- **WHEN** a participant signs in to an initial-certification program class
- **THEN** the default credited hours equal the program hours

#### Scenario: Keep program classes KBEMS-only

- **WHEN** staff select Fire on an initial-certification program class
- **THEN** the system rejects the combination
