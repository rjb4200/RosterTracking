## ADDED Requirements

### Requirement: Catalog lists distinguish empty from no matches

The system SHALL present a different empty state when a reference catalog has no records than when a search matches no records; the no-records state SHALL offer the create action for that catalog and the no-matches state SHALL offer to clear the search.

#### Scenario: No records yet
- **WHEN** a reference catalog has no records
- **THEN** the list explains that no records exist yet and offers the create action for that catalog

#### Scenario: No search matches
- **WHEN** a search term matches no records in a reference catalog
- **THEN** the list reports that no records match the term and offers to clear the search
