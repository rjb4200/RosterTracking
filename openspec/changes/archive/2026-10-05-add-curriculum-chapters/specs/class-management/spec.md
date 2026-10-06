## ADDED Requirements

### Requirement: Class sessions retain a Fire subject chapter and typed book

The system SHALL let a class session store a Fire subject chapter and, when the book is not in the approved catalog, a free-text curriculum name alongside the training-code reference, class name, curriculum reference, and lesson plan. These values SHALL be editable while the class is open or completed and SHALL be preserved at finalization.

#### Scenario: Save a subject chapter
- **WHEN** staff save a class session with a chapter
- **THEN** the system stores the chapter on the session

#### Scenario: Save a typed book
- **WHEN** staff save a class session with a free-text curriculum name
- **THEN** the system stores that name on the session

#### Scenario: Preserve the chapter and typed book at finalization
- **WHEN** a class with a subject chapter or a typed book is finalized
- **THEN** the revision retains the chapter and the typed book name
