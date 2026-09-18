## MODIFIED Requirements

### Requirement: Attendance records the represented agency
The system SHALL require one active agency for each attendance. A regular student SHALL default to the class host agency when they belong to it, SHALL otherwise select from their active memberships or from the active agency catalog, and a guest SHALL select any active agency.

#### Scenario: Default to the class host agency
- **WHEN** a regular student belongs to the class host agency
- **THEN** the workflow preselects that agency as the represented agency

#### Scenario: Select from memberships or the catalog
- **WHEN** a regular student does not belong to the class host agency
- **THEN** the workflow offers their active memberships and the active agency catalog and requires one selection

#### Scenario: Guest selects any active agency
- **WHEN** a guest signs in
- **THEN** the workflow offers every active agency in the catalog

#### Scenario: Reject an inactive agency
- **WHEN** a participant submits an inactive agency
- **THEN** the system rejects attendance without creating a record
