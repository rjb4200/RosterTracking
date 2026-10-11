## ADDED Requirements

### Requirement: Account list distinguishes empty from no matches

The system SHALL present a different empty state when no staff accounts exist than when a search matches no accounts; the no-accounts state SHALL offer the new-account action and the no-matches state SHALL offer to clear the search.

#### Scenario: No accounts yet
- **WHEN** no staff accounts exist
- **THEN** the list explains that no accounts exist yet and offers the new-account action

#### Scenario: No search matches
- **WHEN** a search term matches no staff accounts
- **THEN** the list reports that no accounts match the term and offers to clear the search
