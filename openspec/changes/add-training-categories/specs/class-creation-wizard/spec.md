## MODIFIED Requirements

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
