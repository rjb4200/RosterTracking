# database-provisioning Specification

## Purpose
Make the reusable data a first-class, committed source so a fresh database can be built entirely from the repository, without altering any existing database.
## Requirements
### Requirement: Reusable data has committed, authoritative sources
The repository SHALL contain committed sources for the reusable data — roles and permissions, credential types, agency tags, reporting systems and requirement sets, the MTU catalog, approved curricula and chapters, and training codes — such that none of it is reachable only through a live database.

#### Scenario: Reusable sources are present
- **WHEN** the repository is inspected
- **THEN** each reusable data set has a committed source file or a migration that populates it

#### Scenario: Database-only data is captured
- **WHEN** reusable data exists only in a database, such as training codes or edited MTU entries
- **THEN** it is captured into a committed source by a read-only export before production is provisioned

### Requirement: A fresh database is provisioned from committed sources
The system SHALL provision a fresh, empty database from committed sources alone — applying migrations, then the foundation and reference seeds, then the source imports, then creating the administrator — without reading or modifying any other database.

#### Scenario: Fresh database is provisioned
- **WHEN** provisioning runs against an empty database
- **THEN** the database contains the full reusable data and the administrator account

#### Scenario: Provisioning touches only its target
- **WHEN** provisioning runs
- **THEN** it reads and writes only its target database and modifies no other database

#### Scenario: An existing database is left intact
- **WHEN** a new production database is provisioned from sources
- **THEN** the pre-existing database is not modified and remains usable as the development or test database

### Requirement: Provisioning is repeatable and idempotent
Running provisioning again against the same target SHALL NOT duplicate records or corrupt existing ones, and SHALL revive or update a record whose identity already exists.

#### Scenario: Second run does not duplicate
- **WHEN** provisioning runs twice against the same target
- **THEN** the second run creates no duplicate records

#### Scenario: Existing record is updated in place
- **WHEN** a source entry matches an existing record by identity
- **THEN** the existing record is updated or revived rather than duplicated

### Requirement: The read-only export never modifies its source
The export that captures reusable data SHALL only read from its source database, SHALL write only committed source files, and SHALL produce deterministic, reviewable output.

#### Scenario: Export leaves the source unchanged
- **WHEN** the reference export runs against a database
- **THEN** it modifies no rows and writes only committed source files

#### Scenario: Export output is deterministic
- **WHEN** the export runs twice against the same source
- **THEN** it produces identical output

