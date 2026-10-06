# Class Creation Wizard Specification

## Purpose

Give authorized instructors a fast, reviewable guided path to create a scheduled class that is open for sign-in as soon as it is created, without exposing all setup choices at once.
## Requirements
### Requirement: Guided class creation
The system SHALL present class creation as a Destinations step first, then one step for each selected destination, then a shared class-and-schedule step, and a review step. It SHALL keep entered selections while staff move backward and forward, and SHALL show only the active step's inputs. The Destinations step SHALL let staff select any combination of Fire, KBEMS, and MTU and SHALL NOT offer FEMA. The class-and-schedule step SHALL collect the course, delivery method, training site when required, scheduled start and duration, lead instructor, host agency, and optional student access PIN. Each selected destination SHALL contribute its own step, and that step SHALL collect the information its destination requires.

#### Scenario: Move through class creation
- **WHEN** authorized staff complete a valid step and choose Next
- **THEN** the system advances to the next step and retains the completed step's values

#### Scenario: Correct an earlier selection
- **WHEN** staff return to a previous step from a later step
- **THEN** the system restores their entered values and permits them to change those values before continuing

#### Scenario: Add a destination step
- **WHEN** staff select a destination on the Destinations step
- **THEN** that destination's step becomes part of the workflow in the destination order

#### Scenario: Remove a destination step
- **WHEN** staff clear a destination that had been selected
- **THEN** that destination's step is removed from the workflow and its values are not submitted

#### Scenario: Offer no FEMA destination
- **WHEN** staff view the Destinations step
- **THEN** FEMA is not offered as a selectable destination

#### Scenario: Select the host agency
- **WHEN** staff reach the class-and-schedule step
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

### Requirement: KBEMS destination step captures course objectives
When KBEMS is a selected destination, the system SHALL provide a KBEMS step that captures the course description or objectives used on the KBEMS-E16 roster.

#### Scenario: Enter KBEMS course objectives
- **WHEN** KBEMS is selected and staff complete the KBEMS step
- **THEN** the system retains the course description or objectives for the KBEMS roster

#### Scenario: KBEMS step absent when not selected
- **WHEN** KBEMS is not a selected destination
- **THEN** the workflow does not present a KBEMS step

### Requirement: MTU destination step captures usage
When MTU is a selected destination, the system SHALL provide an MTU step that captures equipment used, mileage, and used supplies as free text.

#### Scenario: Enter MTU usage
- **WHEN** MTU is selected and staff complete the MTU step
- **THEN** the system retains the entered equipment used, mileage, and used supplies for the class

#### Scenario: MTU step absent when not selected
- **WHEN** MTU is not a selected destination
- **THEN** the workflow does not present an MTU step

### Requirement: Fire destination step collects subject rows
When Fire is a selected destination, the system SHALL provide a Fire step that collects up to two subject rows. Each subject row SHALL capture a Category from the searchable training-code catalog, a Class Name, a Curriculum from the searchable approved-curricula catalog, and a free-text Lesson Plan. Selecting a training code SHALL pre-fill the Class Name, and staff SHALL be able to overwrite the Class Name manually.

#### Scenario: Select a training code
- **WHEN** staff choose a training code on a Fire subject row
- **THEN** the system pre-fills the Class Name from the training code's title and keeps it editable

#### Scenario: Override the class name
- **WHEN** staff edit a pre-filled Class Name
- **THEN** the system keeps the typed Class Name while retaining the selected training code as the category

#### Scenario: Add a second subject
- **WHEN** staff add a second Fire subject row
- **THEN** the system collects its category, class name, curriculum, and lesson plan independently of the first

#### Scenario: Limit to two subjects
- **WHEN** two Fire subject rows already exist
- **THEN** the system does not offer a third subject row

#### Scenario: Require the subject essentials
- **WHEN** staff try to leave the Fire step with a subject row that has no category or class name
- **THEN** the system blocks the step and identifies the missing field

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

### Requirement: Fire subject chapter and typed book

When Fire is a selected destination, each subject row SHALL capture a Chapter in addition to its category, class name, curriculum, and lesson plan. The row SHALL offer the selected curriculum's catalog chapters and SHALL accept a typed chapter. The row SHALL let staff enter a book that is not in the approved catalog as a free-text curriculum name. A chapter SHALL be required only when the selected curriculum has catalog chapters.

#### Scenario: Offer catalog chapters on the Fire step
- **WHEN** staff select an approved curriculum that has catalog chapters on a Fire subject row
- **THEN** the row offers those chapters for selection

#### Scenario: Accept a typed chapter
- **WHEN** staff type a chapter on a Fire subject row
- **THEN** the step retains the typed chapter

#### Scenario: Require a chapter for a book with chapters
- **WHEN** staff leave the chapter empty for a curriculum that has catalog chapters and try to advance
- **THEN** the system blocks the step and identifies the missing chapter

#### Scenario: Allow an optional chapter otherwise
- **WHEN** the selected curriculum has no catalog chapters or is a typed book
- **THEN** the step advances without a chapter

#### Scenario: Enter a book outside the catalog
- **WHEN** staff type a book that is not in the approved catalog
- **THEN** the row retains the typed book name

### Requirement: Advancing a step identifies missing required inputs

When staff choose to advance from a wizard step, the system SHALL advance only when the step's required inputs are present; otherwise it SHALL keep staff on the step and identify each missing required input rather than silently preventing advancement.

#### Scenario: Block an incomplete step with identification
- **WHEN** staff choose Next with required inputs missing on the current step
- **THEN** the system stays on the step, highlights the missing required inputs, and does not advance

#### Scenario: Advance a complete step
- **WHEN** all required inputs for the current step are present and staff choose Next
- **THEN** the system advances to the next step

### Requirement: Filtering a search control selects the first match

When staff type into a wizard search control's filter, the system SHALL select the first matching option so the control reflects the filter, and SHALL keep the current selection when the filter matches nothing.

#### Scenario: Select the first match
- **WHEN** staff type a filter that matches one or more options
- **THEN** the control selects the first matching option

#### Scenario: Keep the selection when nothing matches
- **WHEN** staff type a filter that matches no options
- **THEN** the control keeps its current selection

#### Scenario: Leave the selection unchanged when the filter is cleared
- **WHEN** staff clear the filter
- **THEN** the control's selection is unchanged

