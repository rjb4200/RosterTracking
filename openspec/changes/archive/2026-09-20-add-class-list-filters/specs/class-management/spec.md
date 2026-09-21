## ADDED Requirements

### Requirement: Class list defaults to current operational work
The system SHALL present the staff class list scoped by default to current operational work: classes whose scheduled sessions fall on or after the default lookback of 30 days, whose lifecycle state is draft, open, or completed, and classes finalized within the last seven days. The system SHALL exclude cancelled classes and finalized classes older than that grace window unless the operator includes them. The system SHALL let authorized staff widen the list through a session date range, a lifecycle status selection, and explicit inclusion of finalized and cancelled classes, while keeping the existing course and site search.

#### Scenario: Show current work by default
- **WHEN** an authorized staff member opens the class list without changing any filter
- **THEN** the system lists draft, open, and completed classes whose sessions fall within the default recent window together with classes finalized within the last seven days, and excludes cancelled classes

#### Scenario: Hide a stale draft
- **WHEN** a draft class was created more than seven days ago
- **THEN** the system omits that draft from the default list

#### Scenario: Reach a hidden class through the filters
- **WHEN** an operator widens the status or session date filters, or chooses to include finalized and cancelled classes
- **THEN** the system lists the previously hidden classes that match the widened filters

#### Scenario: Retain unfinalized work with students
- **WHEN** a class has at least one active student on its roster, has not been finalized, and its session falls outside the default recent window
- **THEN** the system still lists that class until it is finalized

#### Scenario: Filter by session date range
- **WHEN** an operator sets a session date range
- **THEN** the system lists only classes whose sessions fall within that range, apart from unfinalized classes that have active students

#### Scenario: Search within the active filters
- **WHEN** an operator searches by course or site name
- **THEN** the system limits results to classes matching the search within the active filters

### Requirement: Class list status is scannable
The system SHALL distinguish every lifecycle state on the class list with a colored indicator and the written state name, SHALL keep each state understandable without relying on color alone, and SHALL show an overdue roster as a separate indicator beside the class status rather than replacing it.

#### Scenario: Distinguish lifecycle states
- **WHEN** the class list shows draft, open, completed, finalized, and cancelled classes
- **THEN** each state is visually distinguishable from the others

#### Scenario: Keep status readable without color
- **WHEN** a class status is displayed with a colored indicator
- **THEN** the written lifecycle state remains present

#### Scenario: Flag an overdue roster beside the status
- **WHEN** a class has an overdue roster
- **THEN** the system shows an overdue indicator alongside, not instead of, the lifecycle status
