# reference-data-lifecycle Specification

## Purpose

Give the department's reference records — host agencies, training sites, training codes, and approved curricula — a three-state lifecycle so staff can retire stale entries and refresh state-issued lists without altering any class that used them.

## Requirements

### Requirement: Reference records have three states

The system SHALL represent each host agency, training site, training code, and approved curriculum as active, inactive, or archived. An active record SHALL be offered wherever that catalog is selectable and SHALL be listed in its management screen. An inactive record SHALL NOT be offered but SHALL remain listed in its management screen. An archived record SHALL NOT be offered and SHALL NOT be listed in its management screen.

#### Scenario: Offer only active records
- **WHEN** staff open a picker for a reference catalog
- **THEN** only active records are offered

#### Scenario: List inactive but hide archived
- **WHEN** staff open a reference management screen
- **THEN** active and inactive records are listed and archived records are not shown

#### Scenario: Keep archived records out of pickers
- **WHEN** a record is archived
- **THEN** it is not offered as a selectable option anywhere

### Requirement: Staff move reference records between states

The system SHALL let authorized staff deactivate an active record, reactivate an inactive record, and archive an active or inactive record. Archiving SHALL NOT delete the record and SHALL NOT change any class that references it.

#### Scenario: Deactivate a record
- **WHEN** staff deactivate an active record
- **THEN** it becomes inactive and is no longer offered

#### Scenario: Reactivate a record
- **WHEN** staff reactivate an inactive record
- **THEN** it becomes active and is offered again

#### Scenario: Archive a record
- **WHEN** staff archive a record
- **THEN** it becomes archived, is hidden from its management screen, and is no longer offered

#### Scenario: Preserve referencing classes
- **WHEN** a record is archived
- **THEN** every class that referenced it keeps that reference and remains unchanged

### Requirement: A retired record is revived when its identity is re-added

The system SHALL revive an archived record, rather than create a duplicate, when a record with the same identity is added again, and SHALL reactivate an inactive record when a record with the same identity is added again. For an agency or a training site the identity SHALL be the name; for a training category it SHALL be the kind, code, and source revision; for an approved curriculum it SHALL be the publisher, program title, and source revision.

#### Scenario: Revive an archived agency
- **WHEN** staff create an agency whose name matches an archived agency
- **THEN** the archived agency is revived and its details are updated

#### Scenario: Reactivate an inactive agency
- **WHEN** staff create an agency whose name matches an inactive agency
- **THEN** the inactive agency is reactivated and its details are updated

#### Scenario: Revive an archived site
- **WHEN** staff create a training site whose name matches an archived site
- **THEN** the archived site is revived and its details are updated

#### Scenario: Revive on import
- **WHEN** an import adds a training category or approved curriculum whose identity matches an archived record
- **THEN** that record is revived rather than duplicated

#### Scenario: Distinguish kinds with the same code
- **WHEN** a Fire category and an EMS category share the same code and source revision
- **THEN** the system treats them as distinct records and does not merge or duplicate them

### Requirement: Retired catalog entries follow the approved list

When an import supplies the full approved training-code or curriculum list, the system SHALL archive the catalog entries that are no longer in the imported list and SHALL NOT delete them.

#### Scenario: Archive dropped entries
- **WHEN** an approved-list import runs and an existing entry is not in the imported list
- **THEN** that entry is archived

#### Scenario: Retain history across a refresh
- **WHEN** an entry is archived by an import
- **THEN** classes that referenced it are unchanged and finalized revisions keep their captured facts

### Requirement: Reference management is permission-controlled

The system SHALL require the matching management permission to view or change a reference catalog: `agencies.manage`, `sites.manage`, `training-codes.manage`, and `curricula.manage`.

#### Scenario: Deny a catalog without its permission
- **WHEN** a staff member without a catalog's management permission requests that catalog's management screen
- **THEN** the system denies access

#### Scenario: Provide curricula management
- **WHEN** an administrator holds `curricula.manage`
- **THEN** the curricula management screen is available from staff navigation
