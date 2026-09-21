# Class Creation Wizard Specification

## Purpose

Give authorized instructors a fast, reviewable guided path to create a scheduled class that is open for sign-in as soon as it is created, without exposing all setup choices at once.

## Requirements

### Requirement: Guided class creation
The system SHALL present class creation as a Class step, a Reporting step, and a review step. It SHALL keep entered selections while staff move backward and forward, and SHALL show only the active step's inputs. The Class step SHALL collect the course, delivery method, training site when required, scheduled start and duration, lead instructor, and optional student access PIN. The Reporting step SHALL collect the host agency and reporting systems and SHALL show the student information those systems require.

#### Scenario: Move through class creation
- **WHEN** authorized staff complete a valid step and choose Next
- **THEN** the system advances to the next step and retains the completed step's values

#### Scenario: Correct an earlier selection
- **WHEN** staff return to a previous step from a later step
- **THEN** the system restores their entered values and permits them to change those values before continuing

#### Scenario: Select the host agency
- **WHEN** staff reach the Reporting step
- **THEN** they can select an active agency or add a new one inline before continuing

### Requirement: Final review creates an open class
The system SHALL show a concise summary of the selected course, site, scheduled details, delivery method, host agency, instructor, and reporting destinations before submission. A successful Create action SHALL create one open class with its initial scheduled session, host agency, reporting selections, and assigned lead instructor, ready to accept student sign-in.

#### Scenario: Create and open from the review step
- **WHEN** authorized staff submit a valid reviewed wizard
- **THEN** the system creates the class already open, with its session, host agency, reporting selections, and lead instructor

#### Scenario: Reject incomplete review submission
- **WHEN** staff submit the review step with invalid or missing required information
- **THEN** the system creates no class and identifies the information that requires correction

### Requirement: Wizard layout stays within the viewport on narrow screens
The system SHALL keep the class creation wizard within the width of its container at narrow mobile viewports and SHALL NOT allow control content, including long course, site, or instructor option labels, to widen the page beyond the viewport. The wizard's step-advance and final-submit controls SHALL remain pointer-reachable while the wizard is displayed on a narrow mobile viewport.

#### Scenario: Long option labels do not widen the page
- **WHEN** a selected or listed course, training site, or instructor has a long name and staff open the wizard on a narrow mobile viewport
- **THEN** the page does not scroll horizontally and the wizard content stays within the viewport width

#### Scenario: Step advance remains pointer-operable
- **WHEN** staff complete the required inputs of a step on a narrow mobile viewport and activate the Next control with a pointer
- **THEN** the wizard advances to the next step

#### Scenario: Final submission remains pointer-operable
- **WHEN** staff reach the review step on a narrow mobile viewport and activate the create control with a pointer
- **THEN** the reviewed class is submitted
