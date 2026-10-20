## MODIFIED Requirements

### Requirement: Guided class creation
The system SHALL present class creation as a Destinations step first, then one step for each selected destination, then a shared class-and-schedule step, and a review step. It SHALL keep entered selections while staff move backward and forward, and SHALL show only the active step's inputs. The Destinations step SHALL let staff select Fire, KBEMS, and MTU, SHALL NOT offer FEMA, and SHALL require that MTU be selected together with Fire or KBEMS so a class is never MTU-only. The class-and-schedule step SHALL collect a non-empty set of delivery methods, a required training site, a scheduled start and a duration entered in 15-minute increments, lead instructor, optional assistant instructor, host agency, and optional student access PIN. When neither Fire nor KBEMS is selected, the class-and-schedule step SHALL also collect a class name. Each selected destination SHALL contribute its own step, and that step SHALL collect the information its destination requires.

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

### Requirement: Final review creates an open class
The system SHALL show a concise summary of the class name, site, scheduled details, delivery methods, host agency, lead instructor, assistant instructor when present, the resolved Fire signer when Fire is selected, the certificate signer when KBEMS is selected, and reporting destinations before submission. A successful Create action SHALL create one open class with its initial scheduled session, host agency, reporting selections, assigned lead instructor, and assigned assistant instructor when one was chosen, ready to accept student sign-in.

#### Scenario: Create and open from the review step
- **WHEN** authorized staff submit a valid reviewed wizard
- **THEN** the system creates the class already open, with its session, host agency, reporting selections, lead instructor, and any chosen assistant instructor

#### Scenario: Show the assistant instructor in the review summary
- **WHEN** an assistant instructor was chosen during class creation
- **THEN** the review summary presents the assistant instructor alongside the lead instructor

#### Scenario: Reject incomplete review submission
- **WHEN** staff submit the review step with invalid or missing required information
- **THEN** the system creates no class and identifies the information that requires correction

#### Scenario: Review multiple delivery methods
- **WHEN** the class uses more than one delivery method
- **THEN** the review summary lists every selected delivery method

### Requirement: Class duration defaults to two hours
The class-and-schedule step SHALL default the scheduled duration to two hours, SHALL let staff change it in 15-minute increments, and SHALL present the duration as hours and minutes.

#### Scenario: Default the scheduled duration
- **WHEN** staff reach the class-and-schedule step
- **THEN** the scheduled duration is two hours unless staff change it

#### Scenario: Enter a quarter-hour duration
- **WHEN** staff set the scheduled duration to two hours and fifteen minutes
- **THEN** the duration is retained as 2.25 hours and submitted with the class
