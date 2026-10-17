## MODIFIED Requirements

### Requirement: Reporting context is retained with attendance
The system SHALL retain the effective reporting inclusion-rule versions, every captured student-field value, the credential values supplied at sign-in, and each attendee's resolved reporting inclusion so later profile edits do not change the attendance's reporting facts. When a class's selected reporting systems change, the system SHALL reconcile each active attendance's reporting context with the class's currently resolved requirement sets: it SHALL add a context for each newly selected system and remove the context of each deselected system, deriving an added context's inclusion from the attendee's captured snapshots and the system's active inclusion rule without fabricating any credential or student-field value. A credential correction made after sign-in SHALL re-derive the attendance's reporting inclusion from the corrected value. Sensitive snapshots SHALL remain protected from public display and plaintext logs.

#### Scenario: Preserve sign-in credentials
- **WHEN** a participant signs in on a class with one or more reporting systems selected
- **THEN** the attendance retains the inclusion-rule versions, the supplied credential and student-field snapshots, and the reporting-inclusion resolution used for that submission

#### Scenario: Re-derive inclusion after a correction
- **WHEN** an attendee's credential is corrected after sign-in
- **THEN** the attendance's reporting-inclusion resolution is re-derived from the corrected value, while all other later profile edits leave the reporting facts unchanged

#### Scenario: Reconcile a context for an added reporting system
- **WHEN** a reporting system is added to a class that has active attendance
- **THEN** every active attendance gains a reporting context for that system, with inclusion resolved from the facts it already captured

#### Scenario: Drop a context for a removed reporting system
- **WHEN** a reporting system is removed from a class that has active attendance
- **THEN** no active attendance retains a reporting context for that system

#### Scenario: Derive inclusion without inventing facts
- **WHEN** a context is reconciled for a system whose inclusion rule requires an attribute the attendee never supplied
- **THEN** the attendee resolves as excluded for that system and no credential or student-field value is created for the attendee
