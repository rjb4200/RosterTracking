## ADDED Requirements

### Requirement: Initial-certification program step

When KBEMS is selected and the course type is Initial certification, the KBEMS step SHALL offer the fixed EMR, EMT-B, and AEMT programs. Selecting a program SHALL set its category, course name, and program hours. The class-and-schedule step SHALL use the program start date and program hours instead of a one-day scheduled duration.

#### Scenario: Select an initial-certification program

- **WHEN** staff choose Initial certification on the KBEMS step
- **THEN** the system offers EMR, EMT-B, and AEMT with their fixed hours

#### Scenario: Autofill the KBEMS details

- **WHEN** staff select an initial-certification program
- **THEN** the EMS category and EMS course name are set from that program

#### Scenario: Use program hours in the schedule

- **WHEN** staff reach the class-and-schedule step for an initial-certification program
- **THEN** the class total is the program hours and no separate duration is required

#### Scenario: Block a Fire combination

- **WHEN** Fire is selected together with an initial-certification program
- **THEN** the system blocks advancement and explains that the program is KBEMS-only
