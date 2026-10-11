# database-environments Specification

## Purpose
Give the application separate, isolated databases for production, development, and automated tests so production data cannot be reached, altered, or confused with non-production work.
## Requirements
### Requirement: Each environment uses an isolated database
The system SHALL use a distinct database for the production deployment, for development, and for each mutable automated-test suite. No development target and no automated-test target SHALL be the production database.

#### Scenario: Production deployment uses the production database
- **WHEN** the application runs in its production deployment
- **THEN** it connects to the production database

#### Scenario: Development uses the development database
- **WHEN** the application runs locally or in a preview or development deployment
- **THEN** it connects to the development database and not the production database

#### Scenario: Automated suites use dedicated test databases
- **WHEN** the integration suite and the end-to-end suite run
- **THEN** each connects to its own database, distinct from production and from each other

### Requirement: Database selection is configuration-only
The application SHALL select its database solely from configuration supplied per environment, so moving between environments requires no code change, and a missing or invalid configuration SHALL fail before any database operation rather than fall back to another database.

#### Scenario: Environments differ only by configuration
- **WHEN** the same application build is deployed to the production environment and to a preview environment
- **THEN** each connects to its configured database with no code difference

#### Scenario: Missing configuration fails safely
- **WHEN** the connection configuration for the active environment is absent or invalid
- **THEN** the operation fails with a configuration error and does not use another database

### Requirement: The production database is protected and reserved
The production database SHALL be marked protected so it cannot be deleted, reset, or used as a parent for accidental destructive tooling, and every maintenance and data command — migrations, seeds, imports, administrative commands, and resets — SHALL refuse to operate against it unless the operator explicitly overrides for an approved production operation.

#### Scenario: Production database is protected
- **WHEN** the production database is inspected
- **THEN** it is marked protected and is the deployment default

#### Scenario: Destructive tooling refuses production
- **WHEN** a reset or purge command is invoked with the production database as its target
- **THEN** it exits with an error and modifies no rows

#### Scenario: Maintenance commands refuse production by default
- **WHEN** a migration, seed, import, or administrative command is invoked with the production database as its target
- **THEN** it refuses to run unless the operator explicitly overrides for an approved production operation

### Requirement: The production database holds only launch-ready data
The production database SHALL contain the reference catalogs and the administrator account and SHALL NOT contain test operational data, including classes, students, instructors, attendance, or test audit history.

#### Scenario: Production starts clean
- **WHEN** the production database is inspected after launch preparation
- **THEN** it contains the reference catalogs and the administrator account and no operational test rows

### Requirement: Deployments and continuous integration isolate non-production work
A commit to the default branch SHALL deploy to production, a commit to any other branch SHALL produce a preview deployment using a non-production database, and continuous integration SHALL run its checks against non-production databases without production credentials.

#### Scenario: Default branch deploys to production
- **WHEN** a commit is pushed to the default branch
- **THEN** it deploys to the production environment using the production database

#### Scenario: Other branches deploy to preview
- **WHEN** a commit is pushed to a non-default branch
- **THEN** it produces a preview deployment using a non-production database

#### Scenario: Continuous integration avoids production
- **WHEN** continuous integration runs the verification checks
- **THEN** it uses test-database secrets and never the production database

