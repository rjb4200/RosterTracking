## ADDED Requirements

### Requirement: Class sessions share a roster day
The system SHALL require every scheduled component of a class to occur on the same department-calendar day so one class has one roster for one day while retaining multiple subject sessions.

#### Scenario: Add subjects on one day
- **WHEN** staff add multiple subject sessions on the same department-calendar day
- **THEN** the class retains the sessions under one class roster

#### Scenario: Reject a session on another day
- **WHEN** staff add or update a session whose department-calendar date differs from the class's existing sessions
- **THEN** the system rejects the session with a single-day roster validation error
