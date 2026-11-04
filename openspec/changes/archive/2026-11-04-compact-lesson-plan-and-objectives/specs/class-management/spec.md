## ADDED Requirements

### Requirement: Session lesson plan seeds from a catalog chapter

The system SHALL fill an empty session lesson plan with the selected catalog chapter's title and SHALL preserve manually entered text. If the value still equals the previous chapter's title, the system SHALL replace it when the chapter changes and clear it when the chapter or curriculum is cleared. A typed chapter SHALL NOT seed the lesson plan.

#### Scenario: Select a catalog chapter with an empty lesson plan

- **WHEN** staff select a catalog chapter for a session whose lesson plan is empty
- **THEN** the lesson plan is filled with that chapter's title

#### Scenario: Preserve a manually entered session lesson plan

- **WHEN** staff have typed a session lesson plan and then select a catalog chapter
- **THEN** the typed lesson plan is preserved

#### Scenario: Replace an auto-filled session lesson plan

- **WHEN** the lesson plan still equals the previous chapter's title and staff select another catalog chapter
- **THEN** the lesson plan is replaced with the new chapter's title

#### Scenario: Clear an auto-filled session lesson plan

- **WHEN** the lesson plan still equals the chapter title and staff clear the chapter or change the curriculum
- **THEN** the lesson plan is cleared

#### Scenario: Do not seed from a typed session chapter

- **WHEN** staff choose `Not listed` and type a session chapter
- **THEN** the lesson plan is not filled from the typed chapter

### Requirement: Session lesson plan field is compact

The session editor lesson plan SHALL be presented in a single-line text area.

#### Scenario: Present a compact session lesson plan field

- **WHEN** staff edit a session
- **THEN** the lesson plan is a single-line text area

### Requirement: Class-edit objectives field is compact

The class edit form SHALL present the course description or objectives in a compact two-line text area and SHALL retain the full entered value without a hard character limit or counter.

#### Scenario: Present a compact objectives field on class edit

- **WHEN** staff edit a class
- **THEN** the course description or objectives field is a two-line text area

#### Scenario: Retain the edited objectives

- **WHEN** staff change the course objectives and save the class
- **THEN** the system retains the full entered value
