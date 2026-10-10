# Reference Catalog Management Specification

## Purpose

Give every department reference catalog — host agencies, training sites, training codes, and approved curricula — the same predictable management screens, so staff learn one pattern for browsing, creating, and editing reference records regardless of which catalog they are in.

## Requirements

### Requirement: Reference catalogs share one management-screen pattern

The system SHALL present each reference catalog (host agencies, training sites, training codes, and approved curricula) as a searchable list, a dedicated new-record page, and a dedicated record page.

#### Scenario: Open a catalog management screen
- **WHEN** authorized staff open a reference catalog's management screen
- **THEN** the system shows a searchable list of that catalog's records

#### Scenario: Reach a record from the list
- **WHEN** staff select a record in the list
- **THEN** the system opens that record's dedicated page

### Requirement: The catalog list links to records and offers no inline editing

The system SHALL list each record with its primary label as a link to the record's page, SHALL filter the list by a search term, and SHALL NOT offer record editing or state actions inline in the list.

#### Scenario: Filter the list
- **WHEN** staff enter a search term on a catalog list
- **THEN** only matching records are listed

#### Scenario: No inline editing
- **WHEN** staff view a catalog list
- **THEN** no edit form or state action is offered within a list row

### Requirement: Creating a record happens on a dedicated new-record page

The system SHALL create a reference record from a dedicated new-record page reached from the catalog list, and SHALL NOT present the create form within the list itself.

#### Scenario: Create from the new-record page
- **WHEN** staff submit a new reference record from the new-record page
- **THEN** the record is created and the catalog list includes it

#### Scenario: Return after creating
- **WHEN** staff finish creating a reference record
- **THEN** the system returns them to the catalog list

### Requirement: A record page edits the record and manages its state

The system SHALL show a reference record's edit form on its record page together with the record's state actions — deactivate, reactivate, and archive — and a way back to the catalog list. Archiving from the record page SHALL return staff to the catalog list.

#### Scenario: Edit from the record page
- **WHEN** staff change a record's details on its record page
- **THEN** the change is stored and the record's page reflects it

#### Scenario: Change state from the record page
- **WHEN** staff deactivate, reactivate, or archive a record from its record page
- **THEN** the record's state changes and the catalog list reflects it

#### Scenario: Return to the list after archiving
- **WHEN** staff archive a record from its record page
- **THEN** the system returns them to the catalog list instead of the archived record's page

#### Scenario: Go back without changing anything
- **WHEN** staff choose to go back from a record page
- **THEN** the system returns them to the catalog list

### Requirement: Curricula and training codes are authored without a source revision

The system SHALL NOT ask staff for a source revision when creating or editing a curriculum or a training code, and SHALL NOT display a source revision in their catalog lists. When a curriculum or training code is authored or edited through the admin, the system SHALL store a source revision of `manual`.

#### Scenario: Create a curriculum without a source revision
- **WHEN** staff create a curriculum without entering a source revision
- **THEN** the system stores the curriculum with a source revision of `manual`

#### Scenario: Create a training code without a source revision
- **WHEN** staff create a training code without entering a source revision
- **THEN** the system stores the training code with a source revision of `manual`

#### Scenario: Editing does not ask for a source revision
- **WHEN** staff edit a curriculum or a training code
- **THEN** the form does not present a source-revision field

#### Scenario: Lists omit the source revision
- **WHEN** staff view the curricula or training-codes list
- **THEN** the list does not show a source revision
