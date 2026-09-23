## MODIFIED Requirements

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

## ADDED Requirements

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
