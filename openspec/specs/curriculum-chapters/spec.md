# Curriculum Chapters Specification

## Purpose

Maintain a catalog of the chapters of approved curricula and let a Fire subject record the chapter it covered, or a book outside the approved catalog, so the printed roster reflects what was taught.

## Requirements

### Requirement: Approved curricula chapters form an ordered catalog

The system SHALL maintain a chapter catalog in which each chapter belongs to a curriculum, optionally to a section of that curriculum, and has an ordered number and a title. The system SHALL upsert catalog entries from an approved-curricula chapter reference without duplicating an existing curriculum, section, and number. The catalog SHALL be listable for a curriculum in catalog order.

#### Scenario: Import the chapter reference
- **WHEN** the approved-curricula chapter reference is imported
- **THEN** each chapter is stored against its curriculum, with its section when it has one, and its number and title in catalog order

#### Scenario: Re-import without duplicates
- **WHEN** the same chapter reference is imported again
- **THEN** existing chapters are updated rather than duplicated

#### Scenario: Distinguish repeated numbers across sections
- **WHEN** a curriculum has two sections that reuse the same chapter number
- **THEN** the catalog retains both chapters as distinct entries

#### Scenario: List chapters for a curriculum
- **WHEN** staff select a curriculum that has catalog chapters
- **THEN** the system offers those chapters in catalog order

### Requirement: A chapter is offered and printed with the same label

The system SHALL present each catalog chapter with a label that includes its section when it belongs to one, together with its number and title, and SHALL print that same label with the curriculum on official output.

#### Scenario: Offer a sectioned chapter
- **WHEN** a curriculum chapter belongs to a section
- **THEN** its label includes the section, the chapter number, and the title

#### Scenario: Offer an unsectioned chapter
- **WHEN** a chapter belongs to no section
- **THEN** its label contains the chapter number and title only

#### Scenario: Print the same label
- **WHEN** a subject with a selected chapter is printed
- **THEN** the chapter appears with the same label offered in the selector

### Requirement: A Fire subject can select a chapter

The system SHALL let staff attach a chapter to a Fire subject. When the selected curriculum has catalog chapters, the subject SHALL offer those chapters and SHALL also accept a typed chapter. When the selected curriculum has no catalog chapters, the chapter SHALL be optional free text.

#### Scenario: Suggest catalog chapters
- **WHEN** staff select a curriculum that has catalog chapters
- **THEN** the chapter field offers the catalog chapters for selection

#### Scenario: Accept a typed chapter for a known book
- **WHEN** staff type a chapter that is not in the catalog for a curriculum that has catalog chapters
- **THEN** the system retains the typed chapter

#### Scenario: Leave the chapter optional for a book without chapters
- **WHEN** staff select a curriculum that has no catalog chapters and leave the chapter empty
- **THEN** the system accepts the subject without a chapter

#### Scenario: Require a chapter for a book with chapters
- **WHEN** staff leave the chapter empty for a curriculum that has catalog chapters and try to advance
- **THEN** the system blocks the step and identifies the missing chapter

### Requirement: A Fire subject can use a book outside the approved catalog

The system SHALL let staff record a curriculum that is not in the approved catalog as a free-text book name and SHALL retain that name for the subject.

#### Scenario: Enter a book outside the catalog
- **WHEN** staff enter a book that is not in the approved catalog
- **THEN** the system retains the typed book name for the subject

#### Scenario: Keep the chapter optional for a typed book
- **WHEN** a subject uses a typed book
- **THEN** the chapter is optional free text

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
