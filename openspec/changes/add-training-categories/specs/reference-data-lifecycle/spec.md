## MODIFIED Requirements

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
