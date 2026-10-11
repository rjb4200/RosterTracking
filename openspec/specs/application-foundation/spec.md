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
The repository SHALL provide repeatable commands for linting, static type checking, unit tests, integration tests, end-to-end tests, and production build verification, together with a combined verification command that runs the deterministic set and a separate browser suite that exercises critical user journeys. Mutable suites SHALL each run against their own database, prepared from committed migrations and committed seed data before the suite runs, so results do not depend on rows left behind by an earlier run. Preparing a test database SHALL repopulate the full committed reference catalogs, including the approved curricula, curriculum chapters, and training codes, and not only the foundation and reference seeds. No verification command SHALL require production credentials or read or write the production database, and no verification or development target SHALL be the production database.

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

#### Scenario: Test database includes the full reference catalogs
- **WHEN** a test database is prepared for a suite
- **THEN** it contains the approved curricula, curriculum chapters, and training codes in addition to the foundation and reference seed records

#### Scenario: Repeated verification is reproducible
- **WHEN** a mutable suite runs again after an earlier run of the same suite
- **THEN** it reports the same results as the earlier run

#### Scenario: Verification protects production data
- **WHEN** any verification command runs
- **THEN** it neither reads nor writes the production database

#### Scenario: Verification and development never target production
- **WHEN** a verification command or a development run resolves its database target
- **THEN** it refuses to use the production database

#### Scenario: Critical journeys are covered by the browser suite
- **WHEN** the browser suite runs
- **THEN** it exercises staff sign-in, the workspace landing, the class list, the reporting queue, class detail, and the public student sign-in page

### Requirement: Maintained architecture roadmap
The repository SHALL document the modular-monolith boundaries, approved product decisions, deferred official-form questions, retention strategy, and phased implementation sequence.

#### Scenario: Developer evaluates a later feature
- **WHEN** a developer reads the architecture documentation
- **THEN** the relevant domain boundary, historical-snapshot rule, regular-versus-guest sign-in priority, and implementation phase are identifiable

### Requirement: Production failures reach a monitoring destination
The system SHALL report unexpected server failures in a production deployment to a monitoring destination, including the failure kind, the affected route, and a correlation identifier. A report SHALL NOT include phone numbers, credential values, raw class or device tokens, or other personal values.

#### Scenario: An unexpected server failure is reported
- **WHEN** a server route or action throws an unexpected error in production
- **THEN** a report reaches the monitoring destination carrying the route and a correlation identifier

#### Scenario: Reports exclude personal values
- **WHEN** a failure report is produced
- **THEN** it contains no phone numbers, credential values, or raw class or device tokens

#### Scenario: Missing monitoring configuration does not break the application
- **WHEN** the application runs without a configured monitoring destination
- **THEN** failures are still logged and the application does not fail for want of that destination

### Requirement: Operational recovery is documented and tested
The repository SHALL document the production database backup and restore procedure, SHALL state the snapshot frequency and retention actually configured, and SHALL record a completed restore drill showing that a snapshot restores into a working database. It SHALL also document how production failures are monitored and where their reports are read.

#### Scenario: Recovery procedure is documented
- **WHEN** an operator needs to recover the production database
- **THEN** a written procedure identifies the snapshot source, the restore steps, and how the restored database is verified

#### Scenario: Backup coverage is stated
- **WHEN** the documented procedure is read
- **THEN** it states the snapshot frequency and retention that are actually configured

#### Scenario: A restore drill is recorded
- **WHEN** a restore drill runs
- **THEN** the outcome is recorded, including what was restored and how the restored database was verified

#### Scenario: Monitoring is documented
- **WHEN** an operator needs to find why a production failure occurred
- **THEN** the documentation identifies where failure reports are sent and how to read them

### Requirement: Hardening findings are recorded and triaged
The repository SHALL record each production-hardening review finding with its severity and the review area it came from, and SHALL record for every finding whether it is fixed, deferred as a traceable follow-up, or explicitly accepted with a rationale.

#### Scenario: A finding is recorded
- **WHEN** a review identifies an issue
- **THEN** it is recorded with a severity and the review area it came from

#### Scenario: A critical or high finding is resolved or accepted
- **WHEN** a critical or high-severity finding is identified
- **THEN** it is either fixed or explicitly accepted with a recorded rationale before the hardening cycle is treated as complete

#### Scenario: A deferred finding stays traceable
- **WHEN** a finding is deferred
- **THEN** it is recorded as a follow-up item rather than dropped

### Requirement: Hardened production responses
The system SHALL send a documented set of security response headers on every production response, covering a content security policy, HTTP strict transport security, a frame-ancestors restriction, a nosniff content-type restriction, a referrer policy, and a permissions policy. It SHALL NOT disclose the framework or server version in any response.

#### Scenario: Public responses are hardened
- **WHEN** any public page, sign-in route, or public API route is requested in a production deployment
- **THEN** the response carries the documented security headers

#### Scenario: Staff responses are hardened
- **WHEN** any staff page or staff API route is requested in a production deployment
- **THEN** the response carries the documented security headers

#### Scenario: Version disclosure is removed
- **WHEN** any response is produced
- **THEN** it does not identify the framework or server version

#### Scenario: The hardened policy still serves the application
- **WHEN** the content security policy is applied
- **THEN** the application's own scripts, styles, images, and fonts load, and the staff and public student sign-in journeys complete without a policy violation

