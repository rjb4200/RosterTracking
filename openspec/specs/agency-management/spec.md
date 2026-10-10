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
The system SHALL reject creating or renaming an agency to a name already used by another agency, ignoring letter case and surrounding whitespace.

#### Scenario: Duplicate agency name
- **WHEN** staff create an agency whose name matches an existing agency apart from case or surrounding whitespace
- **THEN** the system rejects the create and reports a duplicate-name error

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
