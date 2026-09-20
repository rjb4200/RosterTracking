## MODIFIED Requirements

### Requirement: Regular identification follows a defined priority
The system SHALL attempt regular student identification in this order: a valid remembered device, normalized current-phone lookup, changed-number recovery using the prior phone plus an existing FFN or KEMSIS ID, and then new-student registration. Identification SHALL use only active student records. A successful regular sign-in SHALL remember the device by default.

#### Scenario: Recognize a remembered student
- **WHEN** a visitor enters an open class with a valid remembered-device token for an active student
- **THEN** the workflow recognizes that student without asking for another lookup identifier

#### Scenario: Fall back after regular lookup fails
- **WHEN** no regular identification pathway resolves an active student
- **THEN** the workflow offers new-student registration as the primary next step, with changed-number recovery and a visually secondary guest option, without displaying possible student matches

#### Scenario: Remember the device by default
- **WHEN** a regular student completes sign-in
- **THEN** the system issues a remembered-device token without requiring an opt-in choice

### Requirement: Phone lookup is normalized and bounded
The system SHALL normalize a submitted phone number before exact-match lookup. A successful exact match MAY show that student's name for `Is this you?` confirmation, but the workflow SHALL never return candidate lists, partial matches, credentials, or data from any other student. Every lookup attempt SHALL be rate-limited to prevent bulk enumeration.

#### Scenario: Find a student by current phone
- **WHEN** a student submits the phone number stored on one active record
- **THEN** the workflow continues with that student's identity confirmation without exposing any other student

#### Scenario: Handle an unknown phone
- **WHEN** a visitor submits a phone number that does not resolve
- **THEN** the workflow starts new-student registration with that phone prefilled, and offers `My phone number changed` and guest options without suggesting partial matches or exposing student data

## ADDED Requirements

### Requirement: An unknown phone number can register a new student
When a submitted phone number does not identify an active student, the system SHALL allow the visitor to register a new regular student in the same class workflow. Registration SHALL collect the first name, last name, the normalized phone number, an email address, every class-required student field, every class-required credential, and one active agency before attendance confirmation. The system SHALL create the student record, its credentials, and its agency membership only inside the successful attendance transaction, and SHALL remember the new device by default. The system SHALL reject a phone number or credential value already in use with the same generic failure and SHALL create no partial records.

#### Scenario: Register and sign in with an unknown phone
- **WHEN** a visitor submits a phone number that does not resolve and completes the registration details with every class-required value and an active agency
- **THEN** the system creates the student, records attendance linked to that student, and remembers the device

#### Scenario: Reject an already-registered phone
- **WHEN** the submitted phone number is already stored on a student record at confirmation time
- **THEN** the transaction creates no student or attendance data and returns a generic failure

#### Scenario: Reject a duplicate credential value
- **WHEN** a class-required credential value is already stored for another student
- **THEN** the transaction creates no student or attendance data and returns a generic failure

#### Scenario: Keep recovery and guest available
- **WHEN** a returning student's phone number changed or a visitor does not want to register
- **THEN** the registration screen still offers `My phone number changed` and guest entry
