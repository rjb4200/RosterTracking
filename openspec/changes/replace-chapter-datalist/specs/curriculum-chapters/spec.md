## MODIFIED Requirements

### Requirement: A Fire subject can select a chapter

The system SHALL let staff attach a chapter to a Fire subject. When the selected curriculum has catalog chapters, the subject SHALL offer every catalog chapter in a filterable selection grouped by section, SHALL present that selection in a scrollable control usable on small screens, and SHALL also accept a typed chapter through a `Not listed` choice. When the selected curriculum has no catalog chapters, the chapter SHALL be optional free text. Changing the selected curriculum SHALL clear the chapter value.

#### Scenario: Suggest catalog chapters
- **WHEN** staff select a curriculum that has catalog chapters
- **THEN** the chapter field offers every catalog chapter for that curriculum, grouped by section

#### Scenario: Filter the catalog chapters
- **WHEN** staff type part of a chapter number or title in the chapter filter
- **THEN** the selection narrows to the matching catalog chapters

#### Scenario: Reach every chapter on a small screen
- **WHEN** staff open the chapter selection on a phone-sized viewport
- **THEN** every catalog chapter is reachable by scrolling the selection

#### Scenario: Accept a typed chapter for a known book
- **WHEN** staff choose `Not listed` and type a chapter that is not in the catalog for a curriculum that has catalog chapters
- **THEN** the system retains the typed chapter

#### Scenario: Clear the chapter when the curriculum changes
- **WHEN** staff change the selected curriculum
- **THEN** the chapter value is cleared

#### Scenario: Leave the chapter optional for a book without chapters
- **WHEN** staff select a curriculum that has no catalog chapters and leave the chapter empty
- **THEN** the system accepts the subject without a chapter

#### Scenario: Require a chapter for a book with chapters
- **WHEN** staff leave the chapter empty for a curriculum that has catalog chapters and try to advance
- **THEN** the system blocks the step and identifies the missing chapter
