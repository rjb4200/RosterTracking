## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Final review creates a scheduled draft
**Reason**: Class creation now creates and opens the class in one action; the draft state no longer exists.
**Migration**: The review step's Create action creates an open class directly. See the added requirement below.

## ADDED Requirements

### Requirement: Final review creates an open class
The system SHALL show a concise summary of the selected course, site, scheduled details, delivery method, host agency, instructor, and reporting destinations before submission. A successful Create action SHALL create one open class with its initial scheduled session, host agency, reporting selections, and assigned lead instructor, ready to accept student sign-in.

#### Scenario: Create and open from the review step
- **WHEN** authorized staff submit a valid reviewed wizard
- **THEN** the system creates the class already open, with its session, host agency, reporting selections, and lead instructor

#### Scenario: Reject incomplete review submission
- **WHEN** staff submit the review step with invalid or missing required information
- **THEN** the system creates no class and identifies the information that requires correction
