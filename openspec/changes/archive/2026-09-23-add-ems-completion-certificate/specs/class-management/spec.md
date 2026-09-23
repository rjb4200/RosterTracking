## ADDED Requirements

### Requirement: Class retains EMS course type and number
The system SHALL let a class store an EMS course type and a course number. These SHALL be editable while the class is open or completed, SHALL be preserved at finalization, and SHALL be available to completion-certificate output.

#### Scenario: Save EMS course details
- **WHEN** staff save a class with a course type and course number
- **THEN** the system stores those values on the class

#### Scenario: Preserve EMS course details at finalization
- **WHEN** a class with a course type and course number is finalized
- **THEN** the revision retains both values for certificate generation

#### Scenario: Later class edit does not rewrite history
- **WHEN** the class course type or number changes after finalization
- **THEN** the existing revision keeps the values captured at finalization
