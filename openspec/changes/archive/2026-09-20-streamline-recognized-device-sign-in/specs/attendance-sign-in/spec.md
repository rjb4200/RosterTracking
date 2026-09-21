## ADDED Requirements

### Requirement: A student may add the represented agency to their memberships
The system SHALL allow a regular student to add the active agency they represent for a class to their agency memberships, and SHALL persist that membership only when attendance confirmation succeeds.

#### Scenario: Add the represented agency at sign-in
- **WHEN** a regular student represents an active agency that is not already in their memberships and confirms attendance
- **THEN** the system records that membership together with the attendance

#### Scenario: Abandoned sign-in does not change memberships
- **WHEN** a student selects an agency but does not confirm attendance
- **THEN** the system stores no membership change
