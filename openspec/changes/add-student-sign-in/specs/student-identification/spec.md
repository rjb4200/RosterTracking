## Purpose

Identify regular students through privacy-preserving public pathways and collect the profile and credential data required for the current class without exposing the student directory.

## ADDED Requirements

### Requirement: Regular identification follows a defined priority
The system SHALL attempt regular student identification in this order: a valid remembered device, normalized phone lookup, Student ID plus PIN recovery, and then the secondary guest pathway. Identification SHALL use only active student records.

#### Scenario: Recognize a remembered student
- **WHEN** a visitor enters an open class with a valid remembered-device token for an active student
- **THEN** the workflow recognizes that student without asking for another lookup identifier

#### Scenario: Fall back after regular lookup fails
- **WHEN** no regular identification pathway resolves an active student
- **THEN** the workflow offers Student ID plus PIN recovery and a visually secondary guest option without displaying possible student matches

### Requirement: Phone lookup is normalized and bounded
The system SHALL normalize a submitted phone number before exact-match lookup. A successful exact match MAY show that student's name for `Is this you?` confirmation, but the workflow SHALL never return candidate lists, partial matches, credentials, or data from any other student. Every lookup attempt SHALL be rate-limited to prevent bulk enumeration.

#### Scenario: Find a student by current phone
- **WHEN** a student submits the phone number stored on one active record
- **THEN** the workflow continues with that student's identity confirmation without exposing any other student

#### Scenario: Handle an unknown phone
- **WHEN** a visitor submits a phone number that does not resolve
- **THEN** the response offers Student ID plus PIN recovery and guest options without suggesting partial matches or exposing student data

### Requirement: Student ID and PIN provide recovery access
The system SHALL allow an active student with a unique Student ID and valid PIN to recover regular access, including staging a replacement for an outdated phone number. The replacement SHALL be applied only if the class attendance confirmation succeeds. PIN values SHALL be hashed and SHALL never be stored or displayed after submission.

#### Scenario: Recover after a phone change
- **WHEN** a student supplies a valid Student ID and PIN and confirms a new available phone number
- **THEN** the system stages the replacement, continues the class sign-in workflow, and updates the record only in the successful attendance transaction

#### Scenario: Reject invalid recovery generically
- **WHEN** a visitor submits an unknown Student ID or invalid PIN
- **THEN** the system returns the same generic recovery failure and does not reveal which value was incorrect

### Requirement: PIN bootstrap and reset are staff-controlled
The system SHALL require authorized staff to establish or reset a student's PIN. A student with a valid existing PIN MAY replace it by supplying that PIN first. Phone lookup or remembered-device recognition alone SHALL NOT authorize PIN creation or replacement. Every successful staff or student PIN mutation SHALL record an audit event without PIN material.

#### Scenario: Establish a first PIN through staff
- **WHEN** authorized staff submit and confirm an acceptable PIN for a student without one
- **THEN** the system stores only its password hash and enables later Student ID plus PIN recovery without redisplaying the PIN

#### Scenario: Block PIN takeover after phone lookup
- **WHEN** a visitor is recognized only by phone number and attempts to establish or replace the student's PIN
- **THEN** the system refuses the PIN change and directs the student to the staff reset process

### Requirement: Remembered devices use revocable opaque tokens
The system SHALL issue an unpredictable remembered-device token only after a successful regular sign-in, store only its cryptographic hash, and associate it with one student, expiration, and revocation state. A remembered device SHALL identify a student but SHALL not itself prove attendance.

#### Scenario: Return on a remembered device
- **WHEN** a student revisits an open class before the remembered token expires or is revoked
- **THEN** the workflow recognizes the associated active student but still requires class-specific confirmation

#### Scenario: Reject an invalid remembered token
- **WHEN** a remembered token is unknown, expired, revoked, or belongs to an inactive student
- **THEN** the workflow discards it and continues with regular lookup without revealing the reason

### Requirement: Class reporting requirements are resolved at sign-in
The system SHALL resolve the effective versioned requirement set for every reporting system selected on the class. Before attendance confirmation, the workflow SHALL collect any missing required student fields or credentials and SHALL retain which requirement-set versions were used.

#### Scenario: Request a missing credential
- **WHEN** an identified student lacks a credential required by an effective class reporting requirement
- **THEN** the workflow requests that credential before allowing attendance confirmation

#### Scenario: Reuse an existing credential
- **WHEN** the student already has every required field and credential
- **THEN** the workflow proceeds without requesting duplicate profile data

### Requirement: Public identification resists enumeration and abuse
The system SHALL rate-limit all phone lookups and repeated PIN attempts using request source and one-way identifier fingerprints. Responses and logs SHALL exclude student lists, partial matches, plaintext PINs, raw remembered tokens, and full credential values.

#### Scenario: Limit repeated attempts
- **WHEN** a request source or identifier exceeds the configured lookup or failed-PIN threshold
- **THEN** further attempts receive a generic temporary-limit response without confirming whether the identifier exists
