## ADDED Requirements

### Requirement: Training codes and curricula are editable

The system SHALL let authorized staff add and edit a training code and an approved curriculum from their management screens. A training code SHALL store a code, a title, and a source revision; an approved curriculum SHALL store a publisher, a program title, an optional version, optional additional requirements, and a source revision. Editing SHALL NOT change a class's stored reference to the record.

#### Scenario: Add a training code
- **WHEN** staff submit a new training code
- **THEN** it is stored and offered as an active training code

#### Scenario: Edit a training code
- **WHEN** staff change a training code's title
- **THEN** the change is stored and every class that referenced the code keeps that reference

#### Scenario: Add a curriculum
- **WHEN** staff submit a new approved curriculum
- **THEN** it is stored and offered as an active curriculum

#### Scenario: Reject a duplicate identity
- **WHEN** staff add or edit a training code or curriculum to an identity that already exists
- **THEN** the system rejects the change and reports the duplicate
