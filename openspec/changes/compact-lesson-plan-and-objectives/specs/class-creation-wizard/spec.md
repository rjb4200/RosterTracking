## ADDED Requirements

### Requirement: Fire lesson plan seeds from a catalog chapter

The system SHALL fill an empty Fire subject lesson plan with the selected catalog chapter's title and SHALL preserve manually entered text. If the value still equals the previous chapter's title, the system SHALL replace it when the chapter changes and clear it when the chapter or curriculum is cleared. A typed chapter SHALL NOT seed the lesson plan.

#### Scenario: Select a catalog chapter with an empty lesson plan

- **WHEN** staff select a catalog chapter on a Fire subject row whose lesson plan is empty
- **THEN** the lesson plan is filled with that chapter's title

#### Scenario: Preserve a manually entered lesson plan

- **WHEN** staff have typed a lesson plan and then select a catalog chapter
- **THEN** the typed lesson plan is preserved

#### Scenario: Replace an auto-filled lesson plan

- **WHEN** the lesson plan still equals the previous chapter's title and staff select another catalog chapter
- **THEN** the lesson plan is replaced with the new chapter's title

#### Scenario: Clear an auto-filled lesson plan

- **WHEN** the lesson plan still equals the chapter title and staff clear the chapter or change the curriculum
- **THEN** the lesson plan is cleared

#### Scenario: Do not seed from a typed chapter

- **WHEN** staff choose `Not listed` and type a chapter
- **THEN** the lesson plan is not filled from the typed chapter

### Requirement: Fire lesson plan field is compact

The Fire subject lesson plan SHALL be presented in a single-line text area.

#### Scenario: Present a compact lesson plan field

- **WHEN** staff view a Fire subject row
- **THEN** the lesson plan is a single-line text area

### Requirement: KBEMS objectives field is compact

The KBEMS course description or objectives SHALL be presented in a compact two-line text area and SHALL retain the full entered value without a hard character limit or counter.

#### Scenario: Present a compact objectives field

- **WHEN** staff view the KBEMS step
- **THEN** the course description or objectives field is a two-line text area

#### Scenario: Retain the entered objectives

- **WHEN** staff enter course objectives and continue
- **THEN** the system retains the full value for the class
