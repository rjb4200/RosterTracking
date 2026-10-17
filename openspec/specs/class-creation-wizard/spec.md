# Class Creation Wizard Specification

## Purpose

Give authorized instructors a fast, reviewable guided path to create a scheduled class that is open for sign-in as soon as it is created, without exposing all setup choices at once.
## Requirements
### Requirement: Guided class creation
The system SHALL present class creation as a Destinations step first, then one step for each selected destination, then a shared class-and-schedule step, and a review step. It SHALL keep entered selections while staff move backward and forward, and SHALL show only the active step's inputs. The Destinations step SHALL let staff select Fire, KBEMS, and MTU, SHALL NOT offer FEMA, and SHALL require that MTU be selected together with Fire or KBEMS so a class is never MTU-only. The class-and-schedule step SHALL collect the delivery method, training site when required, scheduled start and duration, lead instructor, host agency, and optional student access PIN. Each selected destination SHALL contribute its own step, and that step SHALL collect the information its destination requires.

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
When Fire is a selected destination, the system SHALL provide a Fire step that collects up to two subject rows. Each subject row SHALL capture a Category from the searchable Fire training-category catalog, a Class Name, a Curriculum from the searchable approved-curricula catalog, and a free-text Lesson Plan. Selecting a Fire category SHALL pre-fill the Class Name, and staff SHALL be able to overwrite the Class Name manually.

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
- **THEN** the system collects its category, class name, curriculum, and lesson plan independently of the first

#### Scenario: Limit to two subjects
- **WHEN** two Fire subject rows already exist
- **THEN** the system does not offer a third subject row

#### Scenario: Require the subject essentials
- **WHEN** staff try to leave the Fire step with a subject row that has no category or class name
- **THEN** the system blocks the step and identifies the missing field

### Requirement: KBEMS destination step collects EMS course details

When KBEMS is a selected destination, the system SHALL require a Category from the searchable EMS training-category catalog, the EMS course name, a Course type from a selectable set, and the course description or objectives on the KBEMS step. Selecting an EMS category SHALL pre-fill the EMS course name, and staff SHALL be able to overwrite it manually; the selected EMS category SHALL be retained on the class as its structured category. When both Fire and KBEMS are selected, the system SHALL pre-fill the EMS category from the first Fire subject's mapped category, and staff SHALL be able to overwrite it. It SHALL offer a Course number for every course type. For an Initial certification class the Course number SHALL be required and SHALL be expected in the format `<TEI>-<YY>-<CC>-<T>`, where TEI is the configured initial-certification TEI number, YY is a two-digit year, CC is a two-digit Class ID, and T is one of `R`, `B`, `A`, or `P`; the system SHALL match the format case-insensitively and store the value uppercase. For an Initial certification class the system SHALL offer the five most recently used initial-certification numbers for selection and SHALL let staff type a new number; a non-empty value whose shape does not match SHALL raise a warning that the instructor acknowledges, and the step SHALL advance only after acknowledgement and SHALL NOT block on the number's shape. For every other course type the Course number SHALL remain an optional field shown with muted styling that stays editable. When both Fire and KBEMS are selected and the course type is not Initial certification, the system SHALL pre-fill the Course number from the first Fire subject's training code, and staff SHALL be able to overwrite the pre-filled value; for Initial certification the system SHALL NOT pre-fill the Course number from the Fire training code.

#### Scenario: Select an EMS category
- **WHEN** staff choose an EMS category on the KBEMS step
- **THEN** the system pre-fills the EMS course name from the category and keeps it editable, and retains the category as the class's category

#### Scenario: Override the EMS course name
- **WHEN** staff edit a pre-filled EMS course name
- **THEN** the system keeps the typed name while retaining the selected EMS category

#### Scenario: Only EMS categories are offered
- **WHEN** staff open the Category picker on the KBEMS step
- **THEN** the picker offers only EMS categories and no Fire categories

#### Scenario: Require the EMS category
- **WHEN** staff try to leave the KBEMS step without choosing an EMS category
- **THEN** the system blocks the step and identifies the missing category

#### Scenario: Pre-fill the EMS category for a dual Fire and EMS class
- **WHEN** Fire and KBEMS are both selected and the first Fire subject's category has a mapped EMS category
- **THEN** the KBEMS step pre-fills that mapped EMS category while leaving it editable

#### Scenario: Enter the EMS course name
- **WHEN** staff enter the EMS course name on the KBEMS step
- **THEN** the system retains the course name for the class name and the certificate

#### Scenario: Select a course type
- **WHEN** KBEMS is selected and staff choose a course type
- **THEN** the system retains the course type for the class

#### Scenario: Enter a course number
- **WHEN** staff enter a course number in the expected format for an initial-certification class
- **THEN** the system retains the normalized course number for the class

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

#### Scenario: Warn about a malformed initial-certification course number
- **WHEN** staff enter a non-empty course number that does not match the expected format for an Initial certification class and try to leave the KBEMS step
- **THEN** the system shows a warning and advances only after the instructor acknowledges it

#### Scenario: Accept a correctly formatted initial-certification course number without warning
- **WHEN** staff enter a course number matching the expected format for an Initial certification class
- **THEN** the system advances without a warning

#### Scenario: Normalize the course number
- **WHEN** staff enter an initial-certification course number using lowercase letters
- **THEN** the system stores the number uppercase

#### Scenario: Use the configured TEI as the expected prefix
- **WHEN** an administrator has configured a TEI number
- **THEN** the expected initial-certification format uses that TEI number as its prefix

#### Scenario: Offer recently used initial-certification numbers
- **WHEN** staff edit the course number for an Initial certification class
- **THEN** the system offers up to five of the most recently used initial-certification numbers for selection

#### Scenario: Offer the course number for other course types
- **WHEN** staff choose Continuing education or Refresher
- **THEN** the KBEMS step offers the course number as an optional field with muted styling that staff can still edit

#### Scenario: Pre-fill the course number for a dual Fire and EMS class
- **WHEN** Fire and KBEMS are both selected on the Destinations step and the course type is Continuing education or Refresher
- **THEN** the KBEMS step pre-fills the course number from the first Fire subject's training code

#### Scenario: Suppress the pre-fill for initial certification
- **WHEN** Fire and KBEMS are both selected and the course type is Initial certification
- **THEN** the KBEMS step does not pre-fill the course number from the Fire subject's training code

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
The system SHALL set the class name from the first Fire subject's class name when Fire is selected, and from the EMS course name when KBEMS is selected.

#### Scenario: Name a Fire class
- **WHEN** Fire is selected and staff enter a class name on the first Fire subject row
- **THEN** the class name is that first subject's class name

#### Scenario: Name an EMS class
- **WHEN** KBEMS is selected and staff enter the EMS course name
- **THEN** the class name is the EMS course name

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

### Requirement: Inline site and agency creation captures details

When staff add a training site or host agency during class setup, the system SHALL present a form that captures the destination's full details rather than only its name. The name SHALL be required and every other field SHALL be optional. On success the system SHALL select the created or reused record without leaving the workflow.

#### Scenario: Add a site with details
- **WHEN** staff add a training site during class setup
- **THEN** the system presents a form for the site's name and address, and on submit selects the site

#### Scenario: Add an agency with details
- **WHEN** staff add a host agency during class setup
- **THEN** the system presents a form for the agency's name, address, contact, training coordinator, and service tags, and on submit selects the agency

#### Scenario: Details are optional
- **WHEN** staff submit the inline site or agency form with only a name
- **THEN** the system creates or reuses the record and selects it

### Requirement: Searchable catalog controls expose unambiguous accessible names
The system SHALL give the filter input and the value input of each searchable catalog control distinct accessible names, so that a query for the value control by name resolves to exactly one element. The value control's accessible name SHALL NOT contain a required-marker glyph; required state SHALL instead be exposed to assistive technology through the control's required state (`aria-required` or the native `required` attribute).

#### Scenario: Filter and value controls are distinguishable by name
- **WHEN** a searchable catalog control renders its filter input and its value input
- **THEN** the two expose different accessible names, and a name-based query for the value control matches only that control

#### Scenario: Required state is not carried in the accessible name
- **WHEN** a searchable catalog control's value is required
- **THEN** the value control's accessible name contains no required-marker glyph and the control is exposed as required to assistive technology

#### Scenario: Filtering still auto-selects the first match
- **WHEN** staff type into a searchable catalog control's filter
- **THEN** the value control still selects the first matching option, and keeps its current selection when the filter matches nothing

