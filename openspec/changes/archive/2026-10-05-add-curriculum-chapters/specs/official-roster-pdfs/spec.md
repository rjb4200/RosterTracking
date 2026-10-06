## ADDED Requirements

### Requirement: KFS-1A prints the subject chapter with the curriculum

The system SHALL print each finalized subject's curriculum in the KFS-1A Curriculum cell followed by the subject's chapter, joined as `<curriculum> - <chapter>`, where the curriculum is the catalog label or the typed book name and the chapter is the same label offered in the chapter selector, including its section when the chapter belongs to one. When a subject has no chapter, the system SHALL print only the curriculum label.

#### Scenario: Print a known book chapter
- **WHEN** a finalized subject has an approved curriculum and a chapter
- **THEN** the Curriculum cell shows the catalog curriculum label followed by " - " and the chapter, including its section when the chapter belongs to one

#### Scenario: Print a typed book
- **WHEN** a finalized subject has a typed book name
- **THEN** the Curriculum cell shows the typed book name followed by " - " and the chapter

#### Scenario: Omit an absent chapter
- **WHEN** a finalized subject has no chapter
- **THEN** the Curriculum cell shows only the curriculum label

#### Scenario: Omit an absent curriculum
- **WHEN** a finalized subject has neither an approved curriculum nor a typed book
- **THEN** the Curriculum cell is left blank rather than printing a placeholder
