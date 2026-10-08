## MODIFIED Requirements

### Requirement: Class audit log is class-scoped and detailed

The system SHALL produce a class audit log from the append-only audit records associated with the class. The log SHALL include class lifecycle changes, attendance removals, credit adjustments, and public sign-ins, finalization and reopen actions, and reporting and official-output generation events. The system SHALL order entries chronologically and SHALL identify each entry by its department timestamp, actor, action, and affected entity. The log SHALL represent repeated official-output generation by the same actor for the same revision once rather than once per generation: one entry per actor per revision per form for official rosters, and one entry per actor per revision for completion certificates. Official-roster email deliveries SHALL remain represented per send.

#### Scenario: Include class lifecycle changes
- **WHEN** an authorized user views the audit log for a class that has been created, edited, scheduled, assigned, opened, and finalized
- **THEN** every recorded class lifecycle change appears with its actor and timestamp

#### Scenario: Include attendance changes
- **WHEN** attendance for the class was removed or credit-adjusted
- **THEN** each of those events appears in the class audit log

#### Scenario: Include public sign-ins
- **WHEN** a participant signed in to the class through the public sign-in flow
- **THEN** the sign-in event appears in the class audit log

#### Scenario: Include reporting and output events
- **WHEN** an official roster was generated or emailed, a completion certificate was generated, or a reporting destination status was updated for the class
- **THEN** those events appear in the class audit log

#### Scenario: Collapse repeated official-roster generation by one actor
- **WHEN** the same actor generates the same official roster form for the same revision more than once
- **THEN** the class audit log presents a single generation entry for that actor, revision, and form

#### Scenario: Keep a generation entry for each actor
- **WHEN** two different actors generate the same official roster form for the same revision
- **THEN** the class audit log presents a generation entry for each actor

#### Scenario: Collapse repeated certificate generation by one actor
- **WHEN** the same actor generates completion certificates for the same revision more than once
- **THEN** the class audit log presents a single certificate-generation entry for that actor and revision

#### Scenario: Order chronologically
- **WHEN** the class audit log is produced
- **THEN** entries are ordered from earliest to latest
