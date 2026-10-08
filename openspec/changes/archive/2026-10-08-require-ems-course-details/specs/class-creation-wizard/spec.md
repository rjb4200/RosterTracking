## MODIFIED Requirements

### Requirement: KBEMS destination step collects EMS course details

When KBEMS is a selected destination, the system SHALL require the EMS course name as free text, a Course type from a selectable set, and the course description or objectives on the KBEMS step. It SHALL require a Course number as free text only when the course type is Initial certification and SHALL NOT offer a course number for the other course types.

#### Scenario: Enter the EMS course name
- **WHEN** staff enter the EMS course name on the KBEMS step
- **THEN** the system retains the course name for the class name and the certificate

#### Scenario: Select a course type
- **WHEN** KBEMS is selected and staff choose a course type
- **THEN** the system retains the course type for the class

#### Scenario: Enter a course number
- **WHEN** staff enter a course number for an initial-certification class
- **THEN** the system retains the course number for the class

#### Scenario: Leave the course number optional
- **WHEN** staff choose Continuing education or Refresher and leave the course number unset
- **THEN** the system advances without a course number and the certificate later leaves that field blank

#### Scenario: Require the EMS course name
- **WHEN** staff try to leave the KBEMS step without an EMS course name
- **THEN** the system blocks the step and identifies the missing course name

#### Scenario: Require a course type
- **WHEN** staff try to leave the KBEMS step without choosing a course type
- **THEN** the system blocks the step and identifies the missing course type

#### Scenario: Require the course description
- **WHEN** staff try to leave the KBEMS step without a course description or objectives
- **THEN** the system blocks the step and identifies the missing description

#### Scenario: Require a course number for initial certification
- **WHEN** staff choose Initial certification and try to leave the KBEMS step without a course number
- **THEN** the system blocks the step and identifies the missing course number

#### Scenario: Omit the course number for other course types
- **WHEN** staff choose Continuing education or Refresher
- **THEN** the KBEMS step does not offer a course number field
