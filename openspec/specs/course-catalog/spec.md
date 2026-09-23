# Course Catalog Specification

## Purpose

Store Fire training codes, reusable course definitions, and training sites so instructors can select previously used data instead of retyping it, and so classes reference stable catalog records.
## Requirements
### Requirement: Training code catalog
The system SHALL store training codes with a code, title, and source revision, distinct from course definitions.

#### Scenario: Import training codes
- **WHEN** a structured training-code list is imported
- **THEN** codes are stored idempotently keyed by code and source revision

### Requirement: Course definitions
The system SHALL store reusable course definitions with a name, optional description, optional default hours, and an optional training-code reference.

#### Scenario: Create a course
- **WHEN** authorized staff create a course with a name and optional training code
- **THEN** the course is stored once and can be reused by many classes

### Requirement: Training sites
The system SHALL store reusable training sites with a name and optional address fields, SHALL let authorized staff quickly create a new site, and SHALL make active sites searchable during class creation.

#### Scenario: Create a site
- **WHEN** authorized staff create a site that does not exist
- **THEN** the site is stored and available for later class creation

#### Scenario: Create a site from class creation
- **WHEN** a permitted staff member cannot find the required site during class creation
- **THEN** the system lets them create the site inline and selects it for the class without discarding wizard values

### Requirement: Searchable catalog administration
The system SHALL let authorized staff search courses, training codes, and sites by name or code, including while selecting a course or site for a new class.

#### Scenario: Search courses
- **WHEN** authorized staff search courses by a name fragment or training-code fragment
- **THEN** matching active courses are returned

#### Scenario: Select a recently used course
- **WHEN** an instructor begins course selection for a new class and has prior class history
- **THEN** the system surfaces their recently used courses as selectable options

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

