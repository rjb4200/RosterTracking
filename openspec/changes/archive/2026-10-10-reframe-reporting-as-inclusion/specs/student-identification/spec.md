## MODIFIED Requirements

### Requirement: Regular identification follows a defined priority
The system SHALL attempt regular student identification in this order: a valid remembered device, normalized current-phone lookup, changed-number recovery using the prior phone plus the stored email, and then new-student registration. Identification SHALL use only active student records. A successful regular sign-in SHALL remember the device by default.

#### Scenario: Recognize a remembered student
- **WHEN** a visitor enters an open class with a valid remembered-device token for an active student
- **THEN** the workflow recognizes that student without asking for another lookup identifier

#### Scenario: Fall back after regular lookup fails
- **WHEN** no regular identification pathway resolves an active student
- **THEN** the workflow offers new-student registration as the primary next step, with changed-number recovery and a visually secondary guest option, without displaying possible student matches

#### Scenario: Remember the device by default
- **WHEN** a regular student completes sign-in
- **THEN** the system issues a remembered-device token without requiring an opt-in choice

### Requirement: An unknown phone number can register a new student
When a submitted phone number does not identify an active student, the system SHALL allow the visitor to register a new regular student in the same class workflow. Registration SHALL collect the first name, last name, the normalized phone number, an email address, any promoted optional field, any prompted credential, and one active agency before attendance confirmation. The system SHALL create the student record, its credentials, and its agency membership only inside the successful attendance transaction, and SHALL remember the new device by default. The system SHALL reject a phone number or credential value already in use with the same generic failure and SHALL create no partial records.

#### Scenario: Register and sign in with an unknown phone
- **WHEN** a visitor submits a phone number that does not resolve and completes the registration details with an email and an active agency
- **THEN** the system creates the student, records attendance linked to that student, and remembers the device

#### Scenario: Register without a prompted credential
- **WHEN** a visitor completes registration and leaves every prompted credential blank
- **THEN** the system still creates the student and records attendance

#### Scenario: Reject an already-registered phone
- **WHEN** the submitted phone number is already stored on a student record at confirmation time
- **THEN** the transaction creates no student or attendance data and returns a generic failure

#### Scenario: Reject a duplicate credential value
- **WHEN** a supplied credential value is already stored for another student
- **THEN** the transaction creates no student or attendance data and returns a generic failure

#### Scenario: Keep recovery and guest available
- **WHEN** a returning student's phone number changed or a visitor does not want to register
- **THEN** the registration screen still offers `My phone number changed` and guest entry

## REMOVED Requirements

### Requirement: A prior phone and stored credential recover a changed number
**Reason**: Recovery no longer depends on a Fire or EMS credential. Anchoring recovery to the prior phone plus the stored email lets students without an FFN or KEMSIS number still recover their record instead of creating a duplicate.
**Migration**: Replaced by "A prior phone and stored email recover a changed number".

### Requirement: Class reporting requirements are resolved at sign-in
**Reason**: Sign-in no longer collects required credentials. Credentials are optional and only affect which reporting output an attendee appears on, so the workflow must not block confirmation to collect them.
**Migration**: Replaced by "Sign-in prompts follow the selected reporting systems" and "Credential capture affects report inclusion only".

## ADDED Requirements

### Requirement: A prior phone and stored email recover a changed number
When a new phone number does not identify a regular student, the system SHALL allow changed-number recovery by exact matching a submitted prior phone to one active student and then matching a submitted email to that student's stored email, compared case-insensitively and with surrounding whitespace ignored. The workflow SHALL never display the stored email or any credential value. After a match, the student SHALL affirmatively confirm the displayed profile before a unique, available new phone is staged. The new phone SHALL be revalidated and applied only if class attendance confirmation succeeds. When the matched record has no stored email, the system SHALL return the same generic recovery failure as any other non-match.

#### Scenario: Recover after a phone change
- **WHEN** a new phone does not match, and the student supplies the exact prior phone plus the email stored on that record
- **THEN** the system shows the student's profile and masked credentials, requires affirmative verification, stages the available new phone, and updates the record only in the successful attendance transaction

#### Scenario: Reject invalid recovery generically
- **WHEN** the prior phone is unknown, the email does not match, the matched record has no stored email, the student is inactive, or the new phone is unavailable
- **THEN** the system returns the same generic recovery failure and offers guest entry without revealing which value failed

#### Scenario: Reject the recovered profile
- **WHEN** the visitor selects `Not me` instead of affirmatively confirming the recovered profile
- **THEN** the system clears the recovery state, does not stage or apply the new phone, and offers regular or guest entry

#### Scenario: Recheck the new phone at confirmation
- **WHEN** a staged new phone becomes unavailable before attendance confirmation
- **THEN** the transaction applies no student or attendance changes and returns a generic recovery-restart response

#### Scenario: Use guest entry without regular recovery data
- **WHEN** a visitor cannot use a remembered device, current phone, valid changed-number recovery, or new-student registration
- **THEN** the workflow offers class-scoped guest entry that saves no permanent student record

### Requirement: Sign-in prompts follow the selected reporting systems
The system SHALL prompt for credentials based on the reporting systems selected on the class. When Fire is selected, the workflow SHALL prompt for the FFN. When KBEMS is selected, the workflow SHALL prompt for the KEMSIS ID and the NREMT number. When both are selected, the workflow SHALL prompt for all three. The FEMA SID SHALL NOT be prompted. No prompted credential SHALL be required to confirm attendance.

#### Scenario: Prompt for the FFN on a Fire class
- **WHEN** an identified student enters a class with the Fire reporting system selected
- **THEN** the workflow prompts for the FFN and allows confirmation without it

#### Scenario: Prompt for KEMSIS and NREMT on an EMS class
- **WHEN** an identified student enters a class with the KBEMS reporting system selected
- **THEN** the workflow prompts for the KEMSIS ID and the NREMT number and allows confirmation without them

#### Scenario: Prompt for all credentials on a combined class
- **WHEN** a class selects both Fire and KBEMS
- **THEN** the workflow prompts for the FFN, the KEMSIS ID, and the NREMT number

#### Scenario: Never prompt for FEMA SID
- **WHEN** any class prompts for credentials
- **THEN** the FEMA SID is not requested

### Requirement: Credential capture affects report inclusion only
The system SHALL store a supplied credential and SHALL NOT block attendance confirmation when a prompted credential is absent or left blank. A missing credential SHALL only exclude the attendee from the reporting output whose inclusion rule requires it.

#### Scenario: Proceed without a prompted credential
- **WHEN** a student leaves a prompted credential blank
- **THEN** the workflow still allows attendance confirmation

#### Scenario: Missing FFN excludes only the Fire output
- **WHEN** a student confirms attendance on a Fire-selected class without a valid FFN
- **THEN** the attendance is recorded and the attendee is excluded from the Fire output only

### Requirement: A malformed FFN is rejected at sign-in
The system SHALL reject an FFN value submitted at sign-in that does not match the `0000-0000` format and SHALL allow the student to correct it or leave it blank.

#### Scenario: Reject a misformatted FFN entry
- **WHEN** a student submits an FFN that is not in the `0000-0000` format at sign-in
- **THEN** the system rejects the value, stores no FFN, and allows the student to correct it or leave it blank

### Requirement: A student is warned when Fire credit will be withheld
When a class has the Fire reporting system selected and the student has no valid FFN, the workflow SHALL inform the student before confirmation that they can still sign in and receive a certificate, but their training hours will not be credited on the Fire roster without a valid FFN in the `0000-0000` format.

#### Scenario: Warn before confirming without a valid FFN
- **WHEN** a student reaches attendance confirmation on a Fire-selected class without a valid FFN
- **THEN** the workflow shows the Fire-credit warning before confirmation
