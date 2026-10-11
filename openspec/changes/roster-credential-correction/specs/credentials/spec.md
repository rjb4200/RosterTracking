## MODIFIED Requirements

### Requirement: Store student credentials with masked display
The system SHALL store a full credential value plus a masked display suffix and SHALL display only the suffix in normal screens. On a credential-correction surface the system SHALL display the full current value so it can be reviewed and corrected.

#### Scenario: Add a credential
- **WHEN** authorized staff add a credential value for a student and type
- **THEN** the system stores the value and a masked suffix and records an audit event without logging the full value

#### Scenario: Display a credential
- **WHEN** staff view a student's credentials in a normal screen
- **THEN** only the masked suffix is shown, never the full value

#### Scenario: Display a credential on a correction surface
- **WHEN** a credential-correction surface is shown for a prompted credential
- **THEN** the current full value is displayed for review and correction

### Requirement: One active credential per type per student
The system SHALL allow at most one active credential of a given type for a student. When a credential of a type already exists and is replaced, the system SHALL update that credential's value, masked suffix, and lookup hash in place and record an audit event.

#### Scenario: Replace a credential
- **WHEN** a credential of a type already exists and is replaced
- **THEN** the system updates the existing credential in place and records an audit event
