## ADDED Requirements

### Requirement: Curricula and training codes are authored without a source revision

The system SHALL NOT ask staff for a source revision when creating or editing a curriculum or a training code, and SHALL NOT display a source revision in their catalog lists. When a curriculum or training code is authored or edited through the admin, the system SHALL store a source revision of `manual`.

#### Scenario: Create a curriculum without a source revision
- **WHEN** staff create a curriculum without entering a source revision
- **THEN** the system stores the curriculum with a source revision of `manual`

#### Scenario: Create a training code without a source revision
- **WHEN** staff create a training code without entering a source revision
- **THEN** the system stores the training code with a source revision of `manual`

#### Scenario: Editing does not ask for a source revision
- **WHEN** staff edit a curriculum or a training code
- **THEN** the form does not present a source-revision field

#### Scenario: Lists omit the source revision
- **WHEN** staff view the curricula or training-codes list
- **THEN** the list does not show a source revision
