## MODIFIED Requirements

### Requirement: Training codes remain distinct from curricula
The system SHALL keep the training-code catalog, which carries a Fire category kind and an EMS category kind, separate from the approved-curricula catalog, and SHALL allow a class subject to reference both a training category and a curriculum.

#### Scenario: A subject references both
- **WHEN** a Fire subject selects a Fire category and a curriculum
- **THEN** the subject stores both references independently

#### Scenario: Both kinds stay out of the curricula catalog
- **WHEN** staff browse the approved-curricula catalog
- **THEN** neither Fire nor EMS categories are offered as curricula

### Requirement: Training codes and curricula are editable

The system SHALL let authorized staff add and edit a training category and an approved curriculum from their management screens. A training category SHALL store a kind, a code, a title, and a source revision; an approved curriculum SHALL store a publisher, a program title, an optional version, optional additional requirements, and a source revision. Editing SHALL NOT change a class's stored reference to the record.

#### Scenario: Add a training category
- **WHEN** staff submit a new training category of either kind
- **THEN** it is stored with that kind and offered as an active category of that kind

#### Scenario: Edit a training category
- **WHEN** staff change a training category's title
- **THEN** the change is stored and every class that referenced the category keeps that reference

#### Scenario: Add a curriculum
- **WHEN** staff submit a new approved curriculum
- **THEN** it is stored and offered as an active curriculum

#### Scenario: Reject a duplicate identity
- **WHEN** staff add or edit a training category or curriculum to an identity that already exists within its kind
- **THEN** the system rejects the change and reports the duplicate
