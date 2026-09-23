## ADDED Requirements

### Requirement: KBEMS destination step collects EMS course details
When KBEMS is a selected destination, the system SHALL collect a Course type from a selectable set and a Course number as free text on the KBEMS step, in addition to the course description or objectives.

#### Scenario: Select a course type
- **WHEN** KBEMS is selected and staff choose a course type
- **THEN** the system retains the course type for the class

#### Scenario: Enter a course number
- **WHEN** staff enter a course number on the KBEMS step
- **THEN** the system retains the course number for the class

#### Scenario: Leave the course number optional
- **WHEN** staff leave the course number empty
- **THEN** the system allows the step to advance and the certificate later leaves that field blank
