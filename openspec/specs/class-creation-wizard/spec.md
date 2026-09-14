# Class Creation Wizard Specification

## Purpose

Give authorized instructors a fast, reviewable guided path to create a scheduled class draft without exposing all setup choices at once.

## Requirements

### Requirement: Guided class creation
The system SHALL present class creation as Course, Training Site, Class Details, and Reporting steps followed by a review step. It SHALL keep entered selections while staff move backward and forward, and SHALL show only the active step's inputs.

#### Scenario: Move through class creation
- **WHEN** authorized staff complete a valid step and choose Next
- **THEN** the system advances to the next step and retains the completed step's values

#### Scenario: Correct an earlier selection
- **WHEN** staff return to a previous step from a later step
- **THEN** the system restores their entered values and permits them to change those values before continuing

### Requirement: Final review creates a scheduled draft
The system SHALL show a concise summary of the selected course, site, scheduled details, delivery method, instructor, and reporting destinations before submission. A successful Create Class action SHALL create one draft class with its initial scheduled session and assigned lead instructor.

#### Scenario: Create a class from the review step
- **WHEN** authorized staff submit a valid reviewed wizard
- **THEN** the system creates the draft class, its initial scheduled session, reporting selections, and lead-instructor assignment together

#### Scenario: Reject incomplete review submission
- **WHEN** staff submit the review step with invalid or missing required information
- **THEN** the system creates no class and identifies the information that requires correction
