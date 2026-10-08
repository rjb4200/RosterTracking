## MODIFIED Requirements

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

### Requirement: KBEMS destination step collects EMS course details
When KBEMS is a selected destination, the system SHALL collect the EMS course name as free text, a Course type from a selectable set, and a Course number as free text on the KBEMS step, in addition to the course description or objectives.

#### Scenario: Enter the EMS course name
- **WHEN** staff enter the EMS course name on the KBEMS step
- **THEN** the system retains the course name for the class name and the certificate

#### Scenario: Select a course type
- **WHEN** KBEMS is selected and staff choose a course type
- **THEN** the system retains the course type for the class

#### Scenario: Enter a course number
- **WHEN** staff enter a course number on the KBEMS step
- **THEN** the system retains the course number for the class

#### Scenario: Leave the course number optional
- **WHEN** staff leave the course number empty
- **THEN** the system allows the step to advance and the certificate later leaves that field blank

## ADDED Requirements

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

### Requirement: Searchable catalog pickers select the first match
On a Fire subject row, the training-code search and the approved-curricula search SHALL each select the first matching option into their field as staff type, so the field reflects the filtered result without staff opening and choosing it. When a search matches nothing, the field SHALL keep its current selection.

#### Scenario: Typing selects the first training code
- **WHEN** staff type a fragment that matches one or more training codes on a Fire subject row
- **THEN** the first match becomes the Category and the Class Name is pre-filled from it

#### Scenario: Typing selects the first curriculum
- **WHEN** staff type a fragment that matches one or more curricula on a Fire subject row
- **THEN** the first match becomes the Curriculum

#### Scenario: No match keeps the selection
- **WHEN** staff type a fragment that matches no training code or no curriculum
- **THEN** the field keeps its current selection and the entered value is not cleared
