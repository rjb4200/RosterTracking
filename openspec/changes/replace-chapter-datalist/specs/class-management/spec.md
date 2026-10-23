## ADDED Requirements

### Requirement: A session records a chapter with the shared catalog selection

The system SHALL let staff attach a chapter to a scheduled session. When the session's selected curriculum has catalog chapters, the session editor SHALL offer every catalog chapter in a filterable selection grouped by section, SHALL present that selection in a scrollable control usable on small screens, and SHALL also accept a typed chapter through a `Not listed` choice. The chapter SHALL be required when the chosen curriculum has catalog chapters. Changing the session's curriculum SHALL clear its chapter value. When the chosen curriculum has no catalog chapters, the chapter SHALL be optional free text.

#### Scenario: Offer session chapters
- **WHEN** staff choose a curriculum with catalog chapters for a session
- **THEN** the session editor offers every catalog chapter, grouped by section

#### Scenario: Filter session chapters
- **WHEN** staff type part of a chapter number or title in the session chapter filter
- **THEN** the selection narrows to the matching catalog chapters

#### Scenario: Accept a typed session chapter
- **WHEN** staff choose `Not listed` and type a chapter for a session
- **THEN** the system retains the typed chapter for that session

#### Scenario: Preserve a stored non-catalog chapter
- **WHEN** staff edit a session whose stored chapter is not in the selected curriculum's catalog
- **THEN** the editor shows that chapter as the typed value without changing it

#### Scenario: Clear a session chapter on curriculum change
- **WHEN** staff change a session's curriculum
- **THEN** the session's chapter value is cleared

#### Scenario: Require a session chapter
- **WHEN** staff save a session whose curriculum has catalog chapters without a chapter
- **THEN** the system rejects the save and identifies the missing chapter
