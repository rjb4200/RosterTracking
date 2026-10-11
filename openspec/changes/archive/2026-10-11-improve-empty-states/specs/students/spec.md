## ADDED Requirements

### Requirement: Student list distinguishes empty from no matches

The system SHALL present a different empty state when no students exist than when a search matches no students; the no-students state SHALL offer the new-student action and the no-matches state SHALL offer to clear the search.

#### Scenario: No students yet
- **WHEN** no students exist
- **THEN** the list explains that no students exist yet and offers the new-student action

#### Scenario: No search matches
- **WHEN** a search term matches no students
- **THEN** the list reports that no students match the term and offers to clear the search
