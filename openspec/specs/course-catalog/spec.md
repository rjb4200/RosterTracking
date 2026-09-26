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
The system SHALL keep the training-code catalog (Fire category codes) separate from the approved-curricula catalog, and SHALL allow a class subject to reference both a training code and a curriculum.

#### Scenario: A subject references both
- **WHEN** a Fire subject selects a training code and a curriculum
- **THEN** the subject stores both references independently

