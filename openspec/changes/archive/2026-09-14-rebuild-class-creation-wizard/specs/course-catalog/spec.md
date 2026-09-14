## MODIFIED Requirements

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
