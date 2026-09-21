## ADDED Requirements

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
