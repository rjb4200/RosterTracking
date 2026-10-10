## MODIFIED Requirements

### Requirement: A curriculum's chapters are managed from its record page

The system SHALL let authorized staff add, edit, archive, and reactivate a curriculum's chapters from the curriculum's record page. Authoring a chapter SHALL capture a section (optional), a number, and a title, and the system SHALL store the chapter's source revision as `manual`. The system SHALL derive each chapter's position from its number rather than accepting a position, and SHALL list a curriculum's chapters ordered by section and then position.

#### Scenario: Add a chapter
- **WHEN** authorized staff add a chapter with a section, number, and title
- **THEN** the chapter is stored under the curriculum and appears in the chapter list

#### Scenario: Derive the position from the number
- **WHEN** a chapter is authored with a number that begins with an integer
- **THEN** the chapter's position is that integer

#### Scenario: Append a non-numeric chapter
- **WHEN** a chapter is authored with a number that does not begin with an integer, such as "Appendix A"
- **THEN** the chapter is placed at the end of its section in catalog order

#### Scenario: Store the source revision as manual
- **WHEN** a chapter is authored
- **THEN** the system stores the chapter's source revision as `manual` without asking staff for it

#### Scenario: Edit a chapter
- **WHEN** authorized staff change a chapter's section, number, or title
- **THEN** the change is stored and the chapter list reflects it

#### Scenario: Reject a duplicate chapter
- **WHEN** staff author a chapter whose section and number match an active chapter of the same curriculum
- **THEN** the system rejects the change and reports the conflict

#### Scenario: Archive a chapter
- **WHEN** authorized staff archive a chapter
- **THEN** the chapter is hidden from the class chapter selector but retained and can be reactivated

#### Scenario: Reactivate an archived chapter
- **WHEN** authorized staff reactivate an archived chapter
- **THEN** the chapter is offered by the class chapter selector again

#### Scenario: Revive an archived chapter on re-add
- **WHEN** staff author a chapter whose section and number match an archived chapter of the same curriculum
- **THEN** the system reactivates that chapter instead of creating a duplicate
