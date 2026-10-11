## MODIFIED Requirements

### Requirement: Remembered devices use revocable opaque tokens
The system SHALL issue an unpredictable remembered-device token after a successful regular sign-in, store only its cryptographic hash, and associate it with one student, expiration, and revocation state. A remembered device SHALL identify a student but SHALL NOT itself prove attendance. Device recognition SHALL apply on every class entry path, including the public short code and a raw token link.

#### Scenario: Return on a remembered device
- **WHEN** a student revisits an open class before the remembered token expires or is revoked
- **THEN** the workflow recognizes the associated active student and presents one class-specific confirmation screen

#### Scenario: Recognized-student screen shows identity and prompted credentials
- **WHEN** the workflow recognizes a student on a remembered device
- **THEN** it displays the student's name, each class-prompted credential with its current full value, the resolved agency, and a single `Confirm & Sign In` action

#### Scenario: Reject an invalid remembered token
- **WHEN** a remembered token is unknown, expired, revoked, or belongs to an inactive student
- **THEN** the workflow discards it and continues with regular lookup without revealing the reason

#### Scenario: Correct a mistaken recognition
- **WHEN** the recognized student selects `Not me`
- **THEN** the system revokes the device token, clears recognition, and returns to phone entry

#### Scenario: Update recognized information
- **WHEN** the recognized student selects `Update my information`
- **THEN** the workflow collects any prompted credential they need to correct or supply, plus any missing class-required field, before confirmation

## ADDED Requirements

### Requirement: Prompted credentials are editable during sign-in
During regular sign-in, the system SHALL show every credential prompted by the class with its current stored value where present, allow the student to replace or supply any of them, and SHALL NOT require any prompted credential to confirm attendance. The system SHALL validate a supplied value against the credential type's format.

#### Scenario: Correct an existing prompted credential
- **WHEN** an identified student has a prompted credential on file and edits its value
- **THEN** the workflow accepts the replacement and stages it for confirmation

#### Scenario: Supply a missing prompted credential
- **WHEN** an identified student has no value for a prompted credential and supplies one
- **THEN** the workflow stages it for confirmation

#### Scenario: Replace a malformed stored credential
- **WHEN** an identified student has a stored prompted credential that does not match its format
- **THEN** the workflow shows it and allows the student to correct or clear it

#### Scenario: Confirm without a prompted credential
- **WHEN** a student leaves a prompted credential blank
- **THEN** the workflow still allows attendance confirmation
