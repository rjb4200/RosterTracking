# Spec Delta

## MODIFIED Requirements

### Requirement: Guided class creation
The system SHALL present class creation as a Destinations step first, then one step for each selected destination, then a shared class-and-schedule step, and a review step. It SHALL keep entered selections while staff move backward and forward, and SHALL show only the active step's inputs. The Destinations step SHALL let staff select Fire, KBEMS, and MTU, SHALL NOT offer FEMA, and SHALL require that MTU be selected together with Fire or KBEMS so a class is never MTU-only. The class-and-schedule step SHALL collect a non-empty set of delivery methods, a required training site, one class start time, lead instructor, optional assistant instructor, host agency, and optional student access PIN. When Fire is not selected, the step SHALL also collect the single subject duration. When Fire is selected, the Fire step SHALL collect each subject's duration and the class total SHALL be the sum of those durations. When neither Fire nor KBEMS is selected, the class-and-schedule step SHALL also collect a class name. Each selected destination SHALL contribute its own step, and that step SHALL collect the information its destination requires.

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

#### Scenario: Require an accreditation destination with MTU
- **WHEN** staff select MTU on the Destinations step without also selecting Fire or KBEMS
- **THEN** the system blocks advancement and identifies that MTU requires Fire or KBEMS

#### Scenario: Offer no FEMA destination
- **WHEN** staff view the Destinations step
- **THEN** FEMA is not offered as a selectable destination

#### Scenario: Select the host agency
- **WHEN** staff reach the class-and-schedule step
- **THEN** they can select an active agency or add a new one inline before continuing

#### Scenario: Select multiple delivery methods
- **WHEN** staff select Classroom and Hands-On on the class-and-schedule step
- **THEN** both delivery methods are retained and submitted as the class delivery set

#### Scenario: Require a training site
- **WHEN** staff leave the training site unset and choose Next
- **THEN** the system stays on the class-and-schedule step and identifies the missing training site

### Requirement: Fire destination step collects subject rows
When Fire is a selected destination, the system SHALL provide a Fire step that collects up to two subject rows. Each subject row SHALL capture a Category from the searchable Fire training-category catalog, a Class Name, a Curriculum from the searchable approved-curricula catalog, a free-text Lesson Plan, and a credited duration. Selecting a Fire category SHALL pre-fill the Class Name, and staff SHALL be able to overwrite the Class Name manually. The first subject SHALL start at the class start; the second subject SHALL start at the first subject's end.

#### Scenario: Select a Fire category
- **WHEN** staff choose a Fire category on a Fire subject row
- **THEN** the system pre-fills the Class Name from the category's title and keeps it editable

#### Scenario: Only Fire categories are offered
- **WHEN** staff open the Category picker on a Fire subject row
- **THEN** the picker offers only Fire categories and no EMS categories

#### Scenario: Override the class name
- **WHEN** staff edit a pre-filled Class Name
- **THEN** the system keeps the typed Class Name while retaining the selected category

#### Scenario: Add a second subject
- **WHEN** staff add a second Fire subject row
- **THEN** the system collects its category, class name, curriculum, lesson plan, and duration independently of the first

#### Scenario: Limit to two subjects
- **WHEN** two Fire subject rows already exist
- **THEN** the system does not offer a third subject row

#### Scenario: Require the subject essentials
- **WHEN** staff try to leave the Fire step with a subject row that has no category or class name
- **THEN** the system blocks the step and identifies the missing field

#### Scenario: Capture each subject duration
- **WHEN** staff enter a 1.5-hour first subject and a 0.5-hour second subject
- **THEN** the step retains both durations and derives the second subject's start from the first subject's end

### Requirement: Class duration defaults to two hours
Each subject duration SHALL default to two hours and SHALL be chosen through a single duration selection that offers every 15-minute value from 30 minutes through 16 hours. The selection SHALL present each option as hours and minutes (for example, 2h 30m). The step SHALL submit each selected duration as decimal hours. The class scheduled total SHALL be the sum of the subject durations.

#### Scenario: Default the scheduled duration
- **WHEN** staff reach a subject duration field
- **THEN** the duration is two hours unless staff change it

#### Scenario: Choose a combined duration
- **WHEN** staff select 2h 30m from a subject's duration selection
- **THEN** that subject retains 2.5 hours and submits that value

#### Scenario: Enter a quarter-hour duration
- **WHEN** staff set a subject's duration to two hours and fifteen minutes
- **THEN** the duration is retained as 2.25 hours and submitted with the class

#### Scenario: Offer only the supported duration range
- **WHEN** staff open a duration selection
- **THEN** the shortest option is 30m and the longest is 16h, at 15-minute steps

#### Scenario: Show the summed class total
- **WHEN** staff enter a 1.5-hour first subject and a 0.5-hour second subject
- **THEN** the review shows a 2.0-hour class total

## ADDED Requirements

### Requirement: One class start drives the subject schedule
The class-and-schedule step SHALL collect one class start time. Each subject's start and end SHALL be derived sequentially from that start and the subject durations. The workflow SHALL NOT collect independent subject start times and SHALL NOT allow a gap between subjects.

#### Scenario: Derive dual-subject times
- **WHEN** staff enter an 11:00 class start with a 1.5-hour first subject and a 0.5-hour second subject
- **THEN** the review shows the first subject from 11:00 to 12:30 and the second from 12:30 to 13:00

#### Scenario: Do not offer a subject start time
- **WHEN** staff configure a subject row
- **THEN** the workflow does not offer an independent start time for that subject

#### Scenario: Show the derived total before creation
- **WHEN** staff reach the review step
- **THEN** the review shows the class start and the summed duration of all subjects
