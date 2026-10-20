## ADDED Requirements

### Requirement: The class-and-schedule step captures an optional assistant instructor

The class-and-schedule step SHALL present an optional assistant instructor picker beside the lead instructor picker, offering the same active-staff list. It SHALL allow the assistant to be left unset, and SHALL NOT accept the current lead instructor as the assistant.

#### Scenario: Select an assistant instructor
- **WHEN** staff choose an active staff member other than the lead as the assistant instructor on the class-and-schedule step
- **THEN** the assistant instructor is carried into the reviewed class

#### Scenario: Leave the assistant unset
- **WHEN** staff complete the class-and-schedule step without choosing an assistant instructor
- **THEN** the class is created with a lead instructor and no assistant instructor

#### Scenario: Reject the lead as the assistant
- **WHEN** staff choose the current lead instructor as the assistant instructor
- **THEN** the step does not accept the selection and keeps the two roles distinct

### Requirement: A Fire class requires a fire instructor

Before a class with the Fire reporting system is created, the system SHALL require at least one assigned instructor who is a fire instructor — a staff member with both a valid FFN (`0000-0000`) and a Fire Instructor certification level (1, 2, or 3). The lead instructor need not be a fire instructor when the assistant instructor is. When no assigned instructor is a fire instructor, the system SHALL block creation and identify the missing requirement.

#### Scenario: Allow a Fire class led by a non-fire instructor with a fire-qualified assistant
- **WHEN** staff submit a Fire class whose lead instructor is not a fire instructor and whose assistant instructor is a fire instructor
- **THEN** the system creates the class

#### Scenario: Allow a Fire class whose lead is a fire instructor
- **WHEN** staff submit a Fire class whose lead instructor is a fire instructor
- **THEN** the system creates the class

#### Scenario: Block a Fire class with no fire instructor
- **WHEN** staff submit a Fire class whose assigned instructors include no fire instructor
- **THEN** the system blocks creation and identifies that a fire instructor is required

### Requirement: The review summary identifies the document signers

The review step SHALL identify the Fire signer for a Fire class — the fire-eligible lead when eligible, otherwise the fire-eligible assistant — and SHALL identify the class lead as the completion-certificate signer when KBEMS is a destination. When the Fire signer is the assistant, the summary SHALL make clear that the assistant will sign the Fire roster after the class is finalized.

#### Scenario: Show a lead Fire signer
- **WHEN** a Fire class's lead is a fire instructor
- **THEN** the review summary identifies the lead as the Fire signer

#### Scenario: Show an assisting Fire signer
- **WHEN** a Fire class's lead is not a fire instructor and the assistant is
- **THEN** the review summary identifies the assistant as the Fire signer

#### Scenario: Show the certificate signer
- **WHEN** a class reports to KBEMS
- **THEN** the review summary identifies the class lead as the certificate signer

## MODIFIED Requirements

### Requirement: Guided class creation

The system SHALL present class creation as a Destinations step first, then one step for each selected destination, then a shared class-and-schedule step, and a review step. It SHALL keep entered selections while staff move backward and forward, and SHALL show only the active step's inputs. The Destinations step SHALL let staff select Fire, KBEMS, and MTU, SHALL NOT offer FEMA, and SHALL require that MTU be selected together with Fire or KBEMS so a class is never MTU-only. The class-and-schedule step SHALL collect the delivery method, training site when required, scheduled start and duration, lead instructor, optional assistant instructor, host agency, and optional student access PIN. When neither Fire nor KBEMS is selected, the class-and-schedule step SHALL also collect a class name. Each selected destination SHALL contribute its own step, and that step SHALL collect the information its destination requires.

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

### Requirement: Final review creates an open class

The system SHALL show a concise summary of the class name, site, scheduled details, delivery method, host agency, lead instructor, assistant instructor when present, the resolved Fire signer when Fire is selected, the certificate signer when KBEMS is selected, and reporting destinations before submission. A successful Create action SHALL create one open class with its initial scheduled session, host agency, reporting selections, assigned lead instructor, and assigned assistant instructor when one was chosen, ready to accept student sign-in.

#### Scenario: Create and open from the review step
- **WHEN** authorized staff submit a valid reviewed wizard
- **THEN** the system creates the class already open, with its session, host agency, reporting selections, lead instructor, and any chosen assistant instructor

#### Scenario: Show the assistant instructor in the review summary
- **WHEN** an assistant instructor was chosen during class creation
- **THEN** the review summary presents the assistant instructor alongside the lead instructor

#### Scenario: Reject incomplete review submission
- **WHEN** staff submit the review step with invalid or missing required information
- **THEN** the system creates no class and identifies the information that requires correction

## REMOVED Requirements

### Requirement: A Fire class requires valid instructor FFNs
**Reason**: Replaced by the requirement that a Fire class have at least one fire instructor, so a class may be led by an instructor who is not a fire instructor when a fire-qualified assistant is present.
**Migration**: Use "A Fire class requires a fire instructor".
