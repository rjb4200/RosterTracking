# Student Identification Specification

## Purpose

Identify regular students through privacy-preserving public pathways and collect the profile and credential data required for the current class without exposing the student directory.

## Requirements

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

### Requirement: A prior phone and stored credential recover a changed number
When a new phone number does not identify a regular student, the system SHALL allow changed-number recovery by exact matching a submitted prior phone to one active student and then exact matching a student-selected FFN or KEMSIS ID already stored for that student. The challenge SHALL offer the same supported credential choices without revealing which types the matched record stores. When both supported credential types are present, either matching credential SHALL be accepted. The workflow SHALL never display the stored credential value. After a match, the student SHALL affirmatively confirm the displayed profile before a unique, available new phone is staged. The new phone SHALL be revalidated and applied only if class attendance confirmation succeeds.

#### Scenario: Recover after a phone change
- **WHEN** a new phone does not match, and the student supplies the exact prior phone plus a matching stored FFN or KEMSIS ID
- **THEN** the system shows the student's profile and masked credentials, requires affirmative verification, stages the available new phone, and updates the record only in the successful attendance transaction

#### Scenario: Reject invalid recovery generically
- **WHEN** the prior phone is unknown, the credential is absent or incorrect, the student is inactive, or the new phone is unavailable
- **THEN** the system returns the same generic recovery failure and offers guest entry without revealing which value failed

#### Scenario: Use guest entry without regular recovery data
- **WHEN** a visitor cannot use a remembered device, current phone, valid changed-number recovery, or new-student registration
- **THEN** the workflow offers class-scoped guest entry that saves no permanent student record

#### Scenario: Reject the recovered profile
- **WHEN** the visitor selects `Not me` instead of affirmatively confirming the recovered profile
- **THEN** the system clears the recovery state, does not stage or apply the new phone, and offers regular or guest entry

#### Scenario: Recheck the new phone at confirmation
- **WHEN** a staged new phone becomes unavailable before attendance confirmation
- **THEN** the transaction applies no student or attendance changes and returns a generic recovery-restart response

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

### Requirement: Class reporting requirements are resolved at sign-in
The system SHALL resolve the effective versioned requirement set for every reporting system selected on the class. Before attendance confirmation, the workflow SHALL collect any missing required student fields or credentials and SHALL retain which requirement-set versions were used.

#### Scenario: Request a missing credential
- **WHEN** an identified student lacks a credential required by an effective class reporting requirement
- **THEN** the workflow requests that credential before allowing attendance confirmation

#### Scenario: Reuse an existing credential
- **WHEN** the student already has every required field and credential
- **THEN** the workflow proceeds without requesting duplicate profile data

#### Scenario: Do not overwrite an existing permanent value
- **WHEN** a public regular sign-in submits a value that conflicts with an existing student field or credential
- **THEN** the system does not overwrite the permanent value and requires later staff correction when necessary

### Requirement: Public identification resists enumeration and abuse
The system SHALL rate-limit workflow creation, staging writes, current-phone lookup, prior-phone lookup, and credential recovery attempts using class context, request source, and one-way identifier fingerprints. Responses and logs SHALL exclude student lists, partial matches, raw phones, raw remembered tokens, and full credential values.

#### Scenario: Limit repeated attempts
- **WHEN** a request source or identifier exceeds a configured phone-lookup or credential-recovery threshold
- **THEN** further attempts receive a generic temporary-limit response without confirming whether the identifier exists

### Requirement: A regular student supplies an email before confirming attendance
The system SHALL require an identified regular student who lacks an email address to provide a valid email before attendance confirmation, treating it the same as a missing class-required field. The workflow SHALL request only the missing email and SHALL NOT overwrite an existing stored email.

#### Scenario: Prompt for a missing email
- **WHEN** an identified regular student has no email on their record
- **THEN** the workflow requests an email before allowing attendance confirmation

#### Scenario: Accept a supplied email
- **WHEN** a regular student supplies a valid email during the workflow
- **THEN** the system retains the email with the attendance and does not require it again for that class

#### Scenario: Reject an invalid email
- **WHEN** a regular student supplies an invalid email
- **THEN** the workflow reports the error and does not allow confirmation

#### Scenario: Do not overwrite an existing email
- **WHEN** a regular student already has an email
- **THEN** the workflow does not request or replace it
