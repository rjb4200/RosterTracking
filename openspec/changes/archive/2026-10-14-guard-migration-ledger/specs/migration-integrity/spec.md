## ADDED Requirements

### Requirement: Schema changes ship as committed migrations

The system SHALL keep the committed migration set consistent with the schema, so that a change to the schema cannot ship without a matching committed migration. A check SHALL fail when applying the committed migrations to an empty database would not reproduce the current schema.

#### Scenario: A schema change with a migration passes
- **WHEN** the schema changes and a matching migration is committed
- **THEN** the check reports no drift

#### Scenario: A schema change without a migration fails
- **WHEN** the schema changes and no migration is committed
- **THEN** the check fails and names the drift

### Requirement: The committed migration set is internally consistent and append-only

Every migration file SHALL have a journal entry and every journal entry SHALL have a migration file, and a migration that has been published SHALL NOT be edited, renamed, or removed. A check SHALL fail on an orphaned file or entry, or on any change to a published migration.

#### Scenario: An orphaned migration file fails
- **WHEN** a migration file exists with no journal entry, or a journal entry exists with no file
- **THEN** the check fails

#### Scenario: A published migration is unchanged
- **WHEN** the committed set is compared with its published state
- **THEN** every published migration is present and unchanged

#### Scenario: Editing a published migration fails
- **WHEN** a published migration is edited, renamed, or removed
- **THEN** the check fails

### Requirement: Migration status is reportable for a target database

The system SHALL provide a read-only status command that compares a target database's applied migration ledger to the committed migration set and reports what is pending, and SHALL NOT write to the database. The report SHALL account for the migrator's ordering rule, so a committed migration that is older than the database's newest applied migration is reported as skipped rather than silently ignored.

#### Scenario: Database in sync
- **WHEN** the status command runs against a database whose ledger matches the committed set
- **THEN** it reports no pending migrations

#### Scenario: Database is behind
- **WHEN** the status command runs against a database that has not applied the newest committed migrations
- **THEN** it lists those migrations as pending

#### Scenario: Ordering anomaly is surfaced
- **WHEN** a committed migration's order precedes the database's newest applied migration
- **THEN** the status command reports it as skipped rather than leaving it silently unapplied

#### Scenario: Status writes nothing
- **WHEN** the status command runs
- **THEN** it performs no insert, update, or delete

### Requirement: Promotion to the default branch cannot drop or rewrite a migration

A change promoted from a non-default branch to the default branch SHALL carry migrations append-only: every migration present on the default branch SHALL remain present and unchanged, and any new migration SHALL be added after them.

#### Scenario: Appending migrations is allowed
- **WHEN** the promotion adds migrations after the ones already on the default branch
- **THEN** the promotion check passes

#### Scenario: Dropping or rewriting a migration is refused
- **WHEN** the promotion removes, renames, or modifies a migration that is already on the default branch
- **THEN** the promotion check fails
