## ADDED Requirements

### Requirement: MTU catalog empty states guide the operator

The system SHALL explain an empty MTU catalog kind and offer the create-entry action when that kind has no entries, and SHALL report no match and offer to clear the search when a search excludes every entry.

#### Scenario: A kind has no entries
- **WHEN** the equipment, supplies, or transport section of the MTU catalog has no entries
- **THEN** the section explains that no entries of that kind exist yet and offers the create-entry action

#### Scenario: No search matches
- **WHEN** a search term matches no MTU catalog entries
- **THEN** the list reports that no entries match the term and offers to clear the search
