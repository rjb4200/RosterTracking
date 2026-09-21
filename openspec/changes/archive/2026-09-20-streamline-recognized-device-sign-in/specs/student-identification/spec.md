## MODIFIED Requirements

### Requirement: Regular identification follows a defined priority
The system SHALL attempt regular student identification in this order: a valid remembered device, normalized current-phone lookup, changed-number recovery using the prior phone plus an existing FFN or KEMSIS ID, and then the secondary guest pathway. Identification SHALL use only active student records. A successful regular sign-in SHALL remember the device by default.

#### Scenario: Recognize a remembered student
- **WHEN** a visitor enters an open class with a valid remembered-device token for an active student
- **THEN** the workflow recognizes that student without asking for another lookup identifier

#### Scenario: Fall back after regular lookup fails
- **WHEN** no regular identification pathway resolves an active student
- **THEN** the workflow offers changed-number recovery and a visually secondary guest option without displaying possible student matches

#### Scenario: Remember the device by default
- **WHEN** a regular student completes sign-in
- **THEN** the system issues a remembered-device token without requiring an opt-in choice

### Requirement: Remembered devices use revocable opaque tokens
The system SHALL issue an unpredictable remembered-device token after a successful regular sign-in, store only its cryptographic hash, and associate it with one student, expiration, and revocation state. A remembered device SHALL identify a student but SHALL NOT itself prove attendance. Device recognition SHALL apply on every class entry path, including the public short code and a raw token link.

#### Scenario: Return on a remembered device
- **WHEN** a student revisits an open class before the remembered token expires or is revoked
- **THEN** the workflow recognizes the associated active student and presents one class-specific confirmation screen

#### Scenario: Recognized-student screen shows identity
- **WHEN** the workflow recognizes a student on a remembered device
- **THEN** it displays the student's name, the masked FFN and KEMSIS suffixes that are present, the resolved agency, and a single `Confirm & Sign In` action

#### Scenario: Reject an invalid remembered token
- **WHEN** a remembered token is unknown, expired, revoked, or belongs to an inactive student
- **THEN** the workflow discards it and continues with regular lookup without revealing the reason

#### Scenario: Correct a mistaken recognition
- **WHEN** the recognized student selects `Not me`
- **THEN** the system revokes the device token, clears recognition, and returns to phone entry

#### Scenario: Update recognized information
- **WHEN** the recognized student selects `Update my information`
- **THEN** the workflow collects the missing or corrected class-required fields and credentials before confirmation
