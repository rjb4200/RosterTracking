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
