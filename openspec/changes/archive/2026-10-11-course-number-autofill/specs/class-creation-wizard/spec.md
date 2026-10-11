## MODIFIED Requirements

### Requirement: KBEMS destination step collects EMS course details

When KBEMS is a selected destination, the system SHALL require the EMS course name as free text, a Course type from a selectable set, and the course description or objectives on the KBEMS step. It SHALL offer a Course number as free text for every course type: required only when the course type is Initial certification, and otherwise offered as an optional field shown with muted styling that remains editable. When both Fire and KBEMS are selected, the system SHALL pre-fill the Course number from the first Fire subject's training code, and staff SHALL be able to overwrite the pre-filled value.

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

#### Scenario: Offer the course number for other course types
- **WHEN** staff choose Continuing education or Refresher
- **THEN** the KBEMS step offers the course number as an optional field with muted styling that staff can still edit

#### Scenario: Pre-fill the course number for a dual Fire and EMS class
- **WHEN** Fire and KBEMS are both selected on the Destinations step
- **THEN** the KBEMS step pre-fills the course number from the first Fire subject's training code

#### Scenario: Overwrite a pre-filled course number
- **WHEN** staff change a pre-filled course number on the KBEMS step
- **THEN** the system retains the typed value for the class
