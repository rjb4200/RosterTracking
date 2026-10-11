## MODIFIED Requirements

### Requirement: Reporting context is retained with attendance
The system SHALL retain the effective reporting inclusion-rule versions, every captured student-field value, the credential values supplied at sign-in, and each attendee's resolved reporting inclusion so later profile edits do not change the attendance's reporting facts. A credential correction made after sign-in SHALL re-derive the attendance's reporting inclusion from the corrected value. Sensitive snapshots SHALL remain protected from public display and plaintext logs.

#### Scenario: Preserve sign-in credentials
- **WHEN** a participant signs in on a class with one or more reporting systems selected
- **THEN** the attendance retains the inclusion-rule versions, the supplied credential and student-field snapshots, and the reporting-inclusion resolution used for that submission

#### Scenario: Re-derive inclusion after a correction
- **WHEN** an attendee's credential is corrected after sign-in
- **THEN** the attendance's reporting-inclusion resolution is re-derived from the corrected value, while all other later profile edits leave the reporting facts unchanged
