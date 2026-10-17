# Course Catalog Specification

## Purpose

Store Fire training codes, approved curricula, and training sites so instructors can select previously used data instead of retyping it, and so a class carries its own name.
## Requirements
### Requirement: Training code catalog
The system SHALL store training codes with a code, title, and source revision, distinct from approved curricula.

#### Scenario: Import training codes
- **WHEN** a structured training-code list is imported
- **THEN** codes are stored idempotently keyed by code and source revision

### Requirement: Training sites
The system SHALL store reusable training sites with a name and optional address fields, SHALL let authorized staff quickly create a new site, and SHALL make active sites searchable during class creation.

#### Scenario: Create a site
- **WHEN** authorized staff create a site that does not exist
- **THEN** the site is stored and available for later class creation

#### Scenario: Create a site from class creation
- **WHEN** a permitted staff member cannot find the required site during class creation
- **THEN** the system lets them create the site inline and selects it for the class without discarding wizard values

### Requirement: Searchable catalog administration
The system SHALL let authorized staff search training codes and sites by name or code, including while selecting a code or site for a new class.

#### Scenario: Select a recently used site
- **WHEN** an instructor begins site selection for a new class and has prior class history
- **THEN** the system surfaces their recently used sites as selectable options

### Requirement: Approved curricula catalog
The system SHALL store approved curriculum materials with a publisher, program title, optional version, optional additional requirements, and a source revision, imported idempotently and keyed by publisher, program title, and source revision. It SHALL make active curricula searchable during class creation.

#### Scenario: Import the approved curriculum list
- **WHEN** the approved curriculum list is imported
- **THEN** each entry is stored once with its publisher, program title, version, additional requirements, and source revision

#### Scenario: Re-import the same list
- **WHEN** the same approved curriculum list is imported again
- **THEN** existing entries are updated in place and no duplicates are created

#### Scenario: Search curricula
- **WHEN** staff search curricula by a publisher or program-title fragment while creating a class
- **THEN** matching active curricula are returned

### Requirement: Training codes remain distinct from curricula
The system SHALL keep the training-code catalog, which carries a Fire category kind and an EMS category kind, separate from the approved-curricula catalog, and SHALL allow a class subject to reference both a training category and a curriculum.

#### Scenario: A subject references both
- **WHEN** a Fire subject selects a Fire category and a curriculum
- **THEN** the subject stores both references independently

#### Scenario: Both kinds stay out of the curricula catalog
- **WHEN** staff browse the approved-curricula catalog
- **THEN** neither Fire nor EMS categories are offered as curricula

### Requirement: Training codes and curricula are editable

The system SHALL let authorized staff add and edit a training category and an approved curriculum from their management screens. A training category SHALL store a kind, a code, a title, and a source revision; an approved curriculum SHALL store a publisher, a program title, an optional version, optional additional requirements, and a source revision. Editing SHALL NOT change a class's stored reference to the record.

#### Scenario: Add a training category
- **WHEN** staff submit a new training category of either kind
- **THEN** it is stored with that kind and offered as an active category of that kind

#### Scenario: Edit a training category
- **WHEN** staff change a training category's title
- **THEN** the change is stored and every class that referenced the category keeps that reference

#### Scenario: Add a curriculum
- **WHEN** staff submit a new approved curriculum
- **THEN** it is stored and offered as an active curriculum

#### Scenario: Reject a duplicate identity
- **WHEN** staff add or edit a training category or curriculum to an identity that already exists within its kind
- **THEN** the system rejects the change and reports the duplicate

