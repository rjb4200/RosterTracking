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
