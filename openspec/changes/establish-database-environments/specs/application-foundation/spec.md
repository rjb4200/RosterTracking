## MODIFIED Requirements

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
