## ADDED Requirements

### Requirement: Approved curricula catalog
The system SHALL store approved curriculum materials with a publisher, program title, optional version, optional additional requirements, and a source revision, imported idempotently and keyed by publisher, program title, and source revision. It SHALL make active curricula searchable during class creation.

#### Scenario: Import the approved curriculum list
- **WHEN** the approved curriculum list is imported
- **THEN** each entry is stored once with its publisher, program title, version, additional requirements, and source revision

#### Scenario: Re-import the same list
- **WHEN** the same approved curriculum list is imported again
- **THEN** existing entries are updated in place and no duplicates are created

#### Scenario: Search curricula
- **WHEN** staff search curricula by a publisher or program-title fragment while creating a class
- **THEN** matching active curricula are returned

### Requirement: Training codes remain distinct from curricula
The system SHALL keep the training-code catalog (Fire category codes) separate from the approved-curricula catalog, and SHALL allow a class subject to reference both a training code and a curriculum.

#### Scenario: A subject references both
- **WHEN** a Fire subject selects a training code and a curriculum
- **THEN** the subject stores both references independently
