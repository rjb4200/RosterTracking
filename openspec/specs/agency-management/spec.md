# Agency Management Specification

## Purpose

Provide one department agency catalog with contact details that both class reporting and student membership resolve against, so no second agency list has to be maintained.
## Requirements
### Requirement: Agency records carry contact details
The system SHALL store for each agency a name, an address, and contact information consisting of a contact name, a phone number, and an email address. The agency name SHALL be required, and a supplied email address SHALL be validated as an email address.

#### Scenario: Create an agency with contact information
- **WHEN** authorized staff create an agency with a name, address, contact name, phone number, and email address
- **THEN** the system stores the agency and records an audit event

#### Scenario: Reject an invalid contact email
- **WHEN** staff enter an email address that is not a valid email format
- **THEN** the system rejects the save and identifies the email field

### Requirement: Agency names are unique

The system SHALL keep agency names unique, ignoring letter case and surrounding whitespace. When staff create an agency whose name matches an existing active agency, the system SHALL reuse that agency (selecting it) and SHALL NOT create a second record or change the existing one. When staff rename an agency to a name already used by another agency, the system SHALL reject the rename and report a duplicate-name error.

#### Scenario: Reuse an active agency on create
- **WHEN** staff create an agency whose name matches an existing active agency apart from case or surrounding whitespace
- **THEN** the system reuses the existing agency without creating a duplicate or changing it

#### Scenario: Reject a duplicate agency rename
- **WHEN** staff rename an agency to a name already used by another agency
- **THEN** the system rejects the rename and reports a duplicate-name error

### Requirement: Instructors create and edit agencies without deleting
The system SHALL allow staff who can manage classes to create agencies and edit agency details, including while configuring a class, and SHALL NOT provide any agency deletion.

#### Scenario: Add an agency inline during class setup
- **WHEN** a staff member with class-management access adds a new agency while configuring a class
- **THEN** the agency is created in the catalog and becomes selectable without leaving the workflow

#### Scenario: No delete operation
- **WHEN** any staff member views agency management
- **THEN** no delete action is offered for an agency

### Requirement: One catalog serves classes and students
The system SHALL resolve class host agencies and student agency selections from the same active agency catalog and SHALL NOT maintain a separate class agency list or student agency list.

#### Scenario: New agency is immediately selectable
- **WHEN** an agency is created for a class
- **THEN** it is selectable for student membership and for other classes without further setup

#### Scenario: Inactive agency is not offered
- **WHEN** an agency is inactive
- **THEN** it is not offered as a host agency or as a student agency selection

### Requirement: Agency records carry service tags

The system SHALL let an agency carry zero or more service tags drawn from a fixed vocabulary: Fire, EMS, Law Enforcement, Other, Volunteer, and Career. Fire, EMS, Law Enforcement, and Other SHALL describe the agency's service discipline; Volunteer and Career SHALL describe its staffing model.

#### Scenario: Tag an agency with combined services
- **WHEN** staff tag a fire and EMS department
- **THEN** the agency carries both the Fire and EMS tags

#### Scenario: Tag an agency's staffing model
- **WHEN** staff tag a volunteer department
- **THEN** the agency carries the Volunteer tag

#### Scenario: An agency may hold both staffing tags
- **WHEN** staff tag a department that is both volunteer and career
- **THEN** the agency carries both the Volunteer and Career tags

#### Scenario: Tags persist across an edit
- **WHEN** staff edit an agency's details without changing its tags
- **THEN** the agency keeps the tags it already carried

### Requirement: The Other tag carries an optional subtype

The system SHALL allow an agency tagged Other to record one optional subtype from a fixed list — Schools, Hospital, Industry, Business, and Churches — and SHALL reject a subtype on an agency that is not tagged Other.

#### Scenario: Record a subtype under Other
- **WHEN** staff tag a hospital with Other and choose the Hospital subtype
- **THEN** the agency carries the Hospital subtype under Other

#### Scenario: Subtype only under Other
- **WHEN** a subtype is supplied for an agency that is not tagged Other
- **THEN** the system rejects the subtype

### Requirement: Tags are chosen from a controlled vocabulary, not typed

The system SHALL present the service tags and the Other subtypes for selection and SHALL NOT accept a free-text tag value, so the same agency type is never spelled more than one way.

#### Scenario: Select rather than type
- **WHEN** staff describe an agency's type
- **THEN** the system offers the fixed tags for selection and offers no free-text type field

### Requirement: Service tags display as colour-coded badges

The system SHALL display an agency's service tags as colour-coded badges in the agency list and on the agency record page. The Other tag and its subtypes SHALL share one colour, and the badge SHALL read as the chosen subtype or, when no subtype is chosen, as "Other".

#### Scenario: Show tags in the agency list
- **WHEN** staff view the agency list
- **THEN** each agency shows its tags as colour-coded badges

#### Scenario: Subtype shares the Other colour
- **WHEN** an agency carries the Hospital subtype under Other
- **THEN** the badge reads "Hospital" and uses the same colour as Other

#### Scenario: Other without a subtype
- **WHEN** an agency is tagged Other with no subtype
- **THEN** the badge reads "Other"

### Requirement: Agency records may carry a training coordinator contact

The system SHALL let each agency record a training coordinator as a contact distinct from the
agency's general contact, consisting of a coordinator name, a phone number, and an email address.
All three coordinator fields SHALL be optional, and the system SHALL store them separately from the
agency's general contact name, phone, and email.

#### Scenario: Record a coordinator when creating an agency
- **WHEN** authorized staff create an agency with a training coordinator name, phone number, and email address
- **THEN** the system stores the coordinator details on the agency

#### Scenario: Change a coordinator when editing an agency
- **WHEN** staff edit an agency and supply different coordinator name, phone, and email values
- **THEN** the system stores the updated coordinator details on the agency

#### Scenario: Coordinator is optional
- **WHEN** staff save an agency without entering any training coordinator details
- **THEN** the system saves the agency with no coordinator details

#### Scenario: Coordinator is separate from the general contact
- **WHEN** an agency carries both a general contact and a training coordinator
- **THEN** the system stores the two sets of details independently

### Requirement: Training coordinator contact values are validated

The system SHALL validate a training coordinator's contact details when a value is supplied. A
supplied coordinator phone number SHALL be accepted only when it is a valid US 10-digit number, and
a supplied coordinator email address SHALL be accepted only when it is in a valid email format.
Blank coordinator fields SHALL be accepted without error.

#### Scenario: Reject an invalid coordinator phone number
- **WHEN** staff supply a coordinator phone number that is not a valid US 10-digit number
- **THEN** the system rejects the save and reports that the phone number is invalid

#### Scenario: Reject an invalid coordinator email
- **WHEN** staff supply a coordinator email address that is not a valid email format
- **THEN** the system rejects the save and reports that the email is invalid

#### Scenario: Accept a valid coordinator phone number
- **WHEN** staff supply a coordinator phone number of a valid US form, such as `(859) 555-1234`
- **THEN** the system accepts the save and stores the number as `+18595551234`

#### Scenario: Accept blank coordinator fields
- **WHEN** staff supply a coordinator name but leave the coordinator phone and email blank
- **THEN** the system accepts the save without a phone or email validation error

### Requirement: An agency can be the default host agency for new classes

The system SHALL let an Administrator designate at most one active agency as the default host agency for new classes. The default flag SHALL be settable from the standalone New agency and Edit agency forms and SHALL be hidden from staff who are not Administrators. Designating an agency as the default SHALL clear the previous default in the same transaction. Clearing the default SHALL leave the department with no default host agency. The system SHALL show an inline warning before saving when the action would replace or clear the current default. While an agency is the default, the system SHALL refuse to deactivate or archive it. The Agencies list SHALL identify the default agency.

#### Scenario: Set a default while creating an agency
- **WHEN** an Administrator creates an agency with the default checkbox selected
- **THEN** the agency is stored as the default host agency

#### Scenario: Set a default while editing an agency
- **WHEN** an Administrator edits an active agency and selects the default checkbox
- **THEN** the agency is stored as the default host agency

#### Scenario: Replace the previous default
- **WHEN** an Administrator saves a different agency as the default while another agency is already the default
- **THEN** the previous agency is no longer the default and the newly saved agency is the only default

#### Scenario: Clear the default
- **WHEN** an Administrator unchecks the checkbox on the current default agency and saves
- **THEN** no agency is the default and new classes start without a preselected host agency

#### Scenario: Warn before replacing or clearing
- **WHEN** an Administrator changes the default checkbox in a way that would replace or clear the current default
- **THEN** the form shows an inline warning naming the current default before the change is saved

#### Scenario: Block deactivation while default
- **WHEN** staff attempt to deactivate the default host agency
- **THEN** the system refuses the change and requires the default to be cleared first

#### Scenario: Block archiving while default
- **WHEN** staff attempt to archive the default host agency
- **THEN** the system refuses the change and requires the default to be cleared first

#### Scenario: Non-administrator cannot set the default
- **WHEN** a staff member who is not an Administrator submits an agency update that sets the default flag
- **THEN** the system rejects the default change and leaves the existing default unchanged

#### Scenario: Identify the default in the list
- **WHEN** staff view the Agencies list
- **THEN** the default host agency is visibly identified as the default

