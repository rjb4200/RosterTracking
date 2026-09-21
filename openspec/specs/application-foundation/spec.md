# Application Foundation Specification

## Purpose

Provide a runnable, testable, and safely configured application foundation on which the department's roster-management capabilities can be added incrementally.
## Requirements
### Requirement: Runnable application shell
The system SHALL provide a responsive application shell that can be run locally and built for the production deployment target.

#### Scenario: Application starts with valid configuration
- **WHEN** a developer starts the application with all required server configuration
- **THEN** the application serves a public landing page without exposing server secrets

#### Scenario: Production build succeeds
- **WHEN** the production build command runs with valid build-time configuration
- **THEN** it completes successfully and produces a deployable application

### Requirement: Validated server configuration
The system SHALL validate required server environment variables before using dependent infrastructure and SHALL keep secrets unavailable to browser bundles.

#### Scenario: Required configuration is missing
- **WHEN** a server operation requires an absent or invalid environment variable
- **THEN** the operation fails with a clear configuration error and does not attempt a partial database operation

#### Scenario: Browser application is built
- **WHEN** client assets are produced
- **THEN** database URLs, authentication secrets, and password hashes are absent from those assets

### Requirement: Versioned relational schema
The system SHALL define the initial staff identity and authorization schema through ordered, reviewable database migrations.

#### Scenario: Empty database is migrated
- **WHEN** all committed migrations are applied to an empty supported PostgreSQL database
- **THEN** the expected users, roles, permissions, role assignments, and audit tables and constraints exist

#### Scenario: Migration is applied more than once
- **WHEN** the migration command runs against a database that already contains all committed migrations
- **THEN** no schema objects or seed records are duplicated

### Requirement: Atomic database operations
The system SHALL support transactions for operations that must update domain records and audit history together.

#### Scenario: Transactional operation fails
- **WHEN** any required write in a transactional operation fails
- **THEN** none of that operation's writes are committed

### Requirement: Automated quality checks
The repository SHALL provide repeatable commands for linting, static type checking, unit tests, integration tests, end-to-end tests, and production build verification, together with a combined verification command that runs the deterministic set and a separate browser suite that exercises critical user journeys. Mutable suites SHALL each run against their own database, prepared from committed migrations and committed seed data before the suite runs, so results do not depend on rows left behind by an earlier run. No verification command SHALL require production credentials or read or write the production database.

#### Scenario: Foundation verification runs
- **WHEN** the documented verification commands run in a correctly configured development environment
- **THEN** each command exits successfully without requiring production credentials

#### Scenario: Combined verification runs
- **WHEN** the combined verification command runs after a code change
- **THEN** linting, static type checking, unit tests, integration tests, and the production build each run and report their result through that single command

#### Scenario: Fast inner-loop check
- **WHEN** a developer wants a quick signal after editing code
- **THEN** a documented command runs linting and static type checking without starting a database or a browser

#### Scenario: Mutable suites use isolated databases
- **WHEN** the integration suite and the end-to-end suite run
- **THEN** each uses a different database, so neither suite's rows affect the other's results

#### Scenario: Test databases follow committed migrations and seeds
- **WHEN** a test database is prepared for a suite
- **THEN** it is brought to the current schema by applying the committed migrations and populated from committed seed data, without depending on the production database or on branch synchronization

#### Scenario: Repeated verification is reproducible
- **WHEN** a mutable suite runs again after an earlier run of the same suite
- **THEN** it reports the same results as the earlier run

#### Scenario: Verification protects production data
- **WHEN** any verification command runs
- **THEN** it neither reads nor writes the production database

#### Scenario: Critical journeys are covered by the browser suite
- **WHEN** the browser suite runs
- **THEN** it exercises staff sign-in, the workspace landing, the class list, the reporting queue, class detail, and the public student sign-in page

### Requirement: Maintained architecture roadmap
The repository SHALL document the modular-monolith boundaries, approved product decisions, deferred official-form questions, retention strategy, and phased implementation sequence.

#### Scenario: Developer evaluates a later feature
- **WHEN** a developer reads the architecture documentation
- **THEN** the relevant domain boundary, historical-snapshot rule, regular-versus-guest sign-in priority, and implementation phase are identifiable

