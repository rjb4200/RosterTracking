# Class Creation Wizard Specification

## Purpose

Give authorized instructors a fast, reviewable guided path to create a scheduled class that is open for sign-in as soon as it is created, without exposing all setup choices at once.
## Requirements
### Requirement: Guided class creation
The system SHALL present class creation as a Destinations step first, then one step for each selected destination, then a shared class-and-schedule step, and a review step. It SHALL keep entered selections while staff move backward and forward, and SHALL show only the active step's inputs. The Destinations step SHALL let staff select any combination of Fire, KBEMS, and MTU and SHALL NOT offer FEMA. The class-and-schedule step SHALL collect the delivery method, training site when required, scheduled start and duration, lead instructor, host agency, and optional student access PIN. When neither Fire nor KBEMS is selected, the class-and-schedule step SHALL also collect a class name. Each selected destination SHALL contribute its own step, and that step SHALL collect the information its destination requires.

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
The system SHALL show a concise summary of the class name, site, scheduled details, delivery method, host agency, instructor, and reporting destinations before submission. A successful Create action SHALL create one open class with its initial scheduled session, host agency, reporting selections, and assigned lead instructor, ready to accept student sign-in.

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

### Requirement: Searchable catalog controls offer recently used options first

For the wizard's searchable catalog controls, the system SHALL present the options the current staff member has used most recently in a "Recently used" group before the full catalog, so common choices are reachable without scrolling the entire list. The full-catalog group SHALL also include the recently used options.

#### Scenario: Offer recent curricula
- **WHEN** a staff member opens the Curriculum control after creating or instructing classes that used approved curricula
- **THEN** those curricula appear in a "Recently used" group before the full curriculum list

#### Scenario: Offer recent sites
- **WHEN** a staff member opens the Training site control
- **THEN** their recently used sites appear in a "Recently used" group before the full site list

#### Scenario: Omit the group with no history
- **WHEN** a staff member has no recent classes
- **THEN** the control offers the full catalog without a "Recently used" group

#### Scenario: Ignore curricula outside the catalog
- **WHEN** a recent class recorded a typed curriculum that is not in the approved catalog
- **THEN** that value does not appear in the "Recently used" group

### Requirement: The Fire subject curriculum is an either/or choice

The system SHALL present the approved-curricula selection and the not-listed free-text name as a single either/or control, where choosing an approved curriculum clears any typed name and choosing the not-listed option clears any approved selection and reveals the free-text name.

#### Scenario: Choose the not-listed option
- **WHEN** staff choose the not-listed option
- **THEN** a free-text curriculum name field is revealed and any approved selection is cleared

#### Scenario: Choose an approved curriculum
- **WHEN** staff choose an approved curriculum
- **THEN** any typed curriculum name is cleared and the free-text name field is hidden

### Requirement: Class name comes from the destination
The system SHALL set the class name from the first Fire subject's class name when Fire is selected, from the EMS course name when KBEMS is selected, and from a class name entered on the class-and-schedule step when neither Fire nor KBEMS is selected.

#### Scenario: Name a Fire class
- **WHEN** Fire is selected and staff enter a class name on the first Fire subject row
- **THEN** the class name is that first subject's class name

#### Scenario: Name an EMS class
- **WHEN** KBEMS is selected and staff enter the EMS course name
- **THEN** the class name is the EMS course name

#### Scenario: Name an MTU-only class
- **WHEN** only MTU is selected
- **THEN** the class-and-schedule step collects a class name and the class uses it

### Requirement: Class duration defaults to two hours
The class-and-schedule step SHALL default the scheduled duration to two hours and SHALL let staff change it.

#### Scenario: Default the scheduled duration
- **WHEN** staff reach the class-and-schedule step
- **THEN** the scheduled duration is two hours unless staff change it

### Requirement: A Fire class requires valid instructor FFNs
Before a class with the Fire reporting system is created, the system SHALL require that the assigned lead instructor and every assigned assisting instructor have a correctly formatted FFN (`0000-0000`) on their staff profile. When any required instructor does not, the system SHALL block creation and identify the instructor and the missing or misformatted FFN.

#### Scenario: Block creating a Fire class without a valid lead-instructor FFN
- **WHEN** staff submit a Fire class whose assigned lead instructor has no valid FFN on their profile
- **THEN** the system blocks creation and reports that the lead instructor needs a valid FFN

#### Scenario: Block creating a Fire class without a valid assisting-instructor FFN
- **WHEN** staff submit a Fire class with an assigned assisting instructor who has no valid FFN
- **THEN** the system blocks creation and identifies that instructor

#### Scenario: Allow creating a Fire class with valid instructor FFNs
- **WHEN** every assigned instructor on a Fire class has a valid FFN
- **THEN** the system creates the class

