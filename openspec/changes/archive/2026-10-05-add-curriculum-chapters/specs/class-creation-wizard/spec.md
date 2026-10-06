## ADDED Requirements

### Requirement: Fire subject chapter and typed book

When Fire is a selected destination, each subject row SHALL capture a Chapter in addition to its category, class name, curriculum, and lesson plan. The row SHALL offer the selected curriculum's catalog chapters and SHALL accept a typed chapter. The row SHALL let staff enter a book that is not in the approved catalog as a free-text curriculum name. A chapter SHALL be required only when the selected curriculum has catalog chapters.

#### Scenario: Offer catalog chapters on the Fire step
- **WHEN** staff select an approved curriculum that has catalog chapters on a Fire subject row
- **THEN** the row offers those chapters for selection

#### Scenario: Accept a typed chapter
- **WHEN** staff type a chapter on a Fire subject row
- **THEN** the step retains the typed chapter

#### Scenario: Require a chapter for a book with chapters
- **WHEN** staff leave the chapter empty for a curriculum that has catalog chapters and try to advance
- **THEN** the system blocks the step and identifies the missing chapter

#### Scenario: Allow an optional chapter otherwise
- **WHEN** the selected curriculum has no catalog chapters or is a typed book
- **THEN** the step advances without a chapter

#### Scenario: Enter a book outside the catalog
- **WHEN** staff type a book that is not in the approved catalog
- **THEN** the row retains the typed book name
