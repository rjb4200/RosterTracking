# Spec Delta

## MODIFIED Requirements

### Requirement: Guided class creation

The system SHALL present class creation as a Destinations step first, then one step for each selected destination, then a shared class-and-schedule step, and a review step. It SHALL keep entered selections while staff move backward and forward, and SHALL show only the active step's inputs. The Destinations step SHALL let staff select Fire, KBEMS, and MTU, SHALL NOT offer FEMA, and SHALL require that MTU be selected together with Fire or KBEMS so a class is never MTU-only. The class-and-schedule step SHALL collect a non-empty set of delivery methods, a required training site, one class start time, a lead instructor, zero or one assistant instructor, any number of additional instructors, host agency, and optional student access PIN. When Fire is not selected, the step SHALL also collect the single subject duration. When Fire is selected, the Fire step SHALL collect each subject's duration and the class total SHALL be the sum of those durations; the lead instructor SHALL be fire-qualified. When neither Fire nor KBEMS is selected, the class-and-schedule step SHALL also collect a class name. Each selected destination SHALL contribute its own step, and that step SHALL collect the information its destination requires.

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

#### Scenario: Add additional instructors
- **WHEN** staff add instructors beyond the lead and assistant on the class-and-schedule step
- **THEN** the additional instructors are retained and carried into the reviewed class

### Requirement: Final review creates an open class

The system SHALL show a concise summary of the class name, site, scheduled details, delivery methods, host agency, lead instructor, assistant instructor when present, additional instructors when present, the signer of the Fire roster when Fire is selected, the certificate signer when KBEMS is selected, and reporting destinations before submission. A successful Create action SHALL create one open class with its initial scheduled session, host agency, reporting selections, assigned lead instructor, assigned assistant instructor when one was chosen, and assigned additional instructors when any were chosen, ready to accept student sign-in.

#### Scenario: Create and open from the review step
- **WHEN** authorized staff submit a valid reviewed wizard
- **THEN** the system creates the class already open, with its session, host agency, reporting selections, lead instructor, any chosen assistant instructor, and any chosen additional instructors

#### Scenario: Show the assistant instructor in the review summary
- **WHEN** an assistant instructor was chosen during class creation
- **THEN** the review summary presents the assistant instructor alongside the lead instructor

#### Scenario: Show additional instructors in the review summary
- **WHEN** additional instructors were chosen during class creation
- **THEN** the review summary presents them separately from the assistant instructor

#### Scenario: Reject incomplete review submission
- **WHEN** staff submit the review step with invalid or missing required information
- **THEN** the system creates no class and identifies the information that requires correction

#### Scenario: Review multiple delivery methods
- **WHEN** the class uses more than one delivery method
- **THEN** the review summary lists every selected delivery method

### Requirement: The class-and-schedule step captures an optional assistant instructor

The class-and-schedule step SHALL present an optional assistant instructor picker beside the lead instructor picker, offering the same active-staff list. It SHALL allow the assistant to be left unset and SHALL NOT accept the current lead instructor as the assistant. It SHALL also let staff add any number of additional instructors from the same active-staff list; additional instructors SHALL NOT be the lead or assistant.

#### Scenario: Select an assistant instructor
- **WHEN** staff choose an active staff member other than the lead as the assistant instructor on the class-and-schedule step
- **THEN** the assistant instructor is carried into the reviewed class

#### Scenario: Leave the assistant unset
- **WHEN** staff complete the class-and-schedule step without choosing an assistant instructor
- **THEN** the class is created with a lead instructor and no assistant instructor

#### Scenario: Reject the lead as the assistant
- **WHEN** staff choose the current lead instructor as the assistant instructor
- **THEN** the step does not accept the selection and keeps the two roles distinct

#### Scenario: Add an additional instructor
- **WHEN** staff add an active staff member other than the lead and assistant as an additional instructor
- **THEN** that instructor is carried into the reviewed class as an additional instructor

#### Scenario: Reject a role conflict
- **WHEN** staff choose the lead or assistant as an additional instructor
- **THEN** the step does not accept the selection and keeps the roles distinct

## ADDED Requirements

### Requirement: Fire classes require a fire-qualified lead

Before a class with the Fire reporting system is created, the system SHALL require the lead instructor to be a fire instructor: a staff member with both a valid FFN (`0000-0000`) and a Fire Instructor certification level (1, 2, or 3). A fire-qualified assistant or additional instructor SHALL NOT satisfy this requirement. When the lead is not a fire instructor, the system SHALL block creation and identify the missing requirement.

#### Scenario: Allow a Fire class whose lead is a fire instructor
- **WHEN** staff submit a Fire class whose lead instructor is a fire instructor
- **THEN** the system creates the class

#### Scenario: Block a Fire class whose lead is not a fire instructor
- **WHEN** staff submit a Fire class whose lead is not a fire instructor, even when an assistant or additional instructor is fire-qualified
- **THEN** the system blocks creation and identifies that the lead must be a fire instructor

### Requirement: The review summary identifies the lead as the sole signer

The review step SHALL identify the class lead as the Fire roster signer for a Fire class and as the completion-certificate signer when KBEMS is a destination. It SHALL NOT identify a separate Fire signer or an assistant as a signer. Additional instructors SHALL be identified as team members without signing authority.

#### Scenario: Show the Fire roster signer
- **WHEN** a Fire class is reviewed
- **THEN** the review summary identifies the class lead as the Fire roster signer

#### Scenario: Show the certificate signer
- **WHEN** a class reports to KBEMS
- **THEN** the review summary identifies the class lead as the certificate signer

#### Scenario: Do not imply assistant signing authority
- **WHEN** an assistant or additional instructor is present
- **THEN** the review summary does not identify that instructor as a document signer

## REMOVED Requirements

### Requirement: A Fire class requires a fire instructor
**Reason**: Replaced by the lead-only signing model, where the lead must be fire-qualified.
**Migration**: Assign a fire-qualified lead to every Fire class and update the wizard validation to the new requirement.

### Requirement: The review summary identifies the document signers
**Reason**: Replaced by the lead-as-sole-signer summary.
**Migration**: Review screens identify the lead as the Fire and certificate signer and no longer identify an assistant Fire signer.
