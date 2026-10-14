## MODIFIED Requirements

### Requirement: A curriculum's chapters are managed from its record page

The system SHALL let authorized staff add, edit, archive, and reactivate a curriculum's chapters from the curriculum's record page. Authoring a chapter SHALL capture a section (optional), a number, and a title, and the system SHALL store the chapter's source revision as `manual`. The system SHALL derive each chapter's position from its number rather than accepting a position. The record page SHALL list a curriculum's active chapters in book order — sections in the order they occur in the catalog and chapters in numeric order within each section — with unsectioned chapters listed last. The record page SHALL hide archived chapters from that list and SHALL present them separately so they can be reactivated. Re-authoring a section and number that matches an archived chapter SHALL reactivate that chapter rather than blocking the entry. Archiving a chapter SHALL NOT change any class that recorded it or any finalized roster.

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

#### Scenario: Order the chapter list in book order
- **WHEN** staff view a curriculum's chapters
- **THEN** sections appear in the order they occur in the catalog, chapters appear in numeric order within each section, and unsectioned chapters appear last

#### Scenario: Archive a chapter
- **WHEN** authorized staff archive a chapter
- **THEN** the chapter is hidden from the default chapter list and from the class chapter selector but is retained and can be reactivated

#### Scenario: See archived chapters separately
- **WHEN** a curriculum has archived chapters
- **THEN** the record page presents them separately from the active list rather than among the active chapters

#### Scenario: Reactivate an archived chapter
- **WHEN** authorized staff reactivate an archived chapter
- **THEN** the chapter returns to the active chapter list and is offered by the class chapter selector again

#### Scenario: Re-add an archived chapter number without being blocked
- **WHEN** staff archive a chapter, such as chapter 8, and later author a chapter with the same section and number
- **THEN** the system reactivates that archived chapter and the entry succeeds, without a duplicate and without blocking the author

#### Scenario: Leave past rosters unchanged when a chapter is archived
- **WHEN** a chapter that a class recorded is archived and removed from the list
- **THEN** that class and any finalized roster keep the chapter value they recorded, because the class stores the chapter value and finalization snapshots it, independent of the catalog
