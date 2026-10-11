# credential-correction Specification

## Purpose

Let an attendee's class-prompted credential be corrected — by the student at sign-in or by an assigned instructor afterwards — and carry that correction through to reporting inclusion and the roster without reopening the class.

## Requirements

### Requirement: A prompted credential can be replaced for an attendance
The system SHALL allow a class-prompted credential for an attendee to be replaced with a new value, whether the previous value was valid, malformed, or absent. A replacement SHALL update the student's canonical credential for that type in place and the attendance's credential snapshot for the class, and SHALL record an audit event.

#### Scenario: Student corrects a credential at sign-in
- **WHEN** a recognized student supplies a new value for a prompted credential they already have on file
- **THEN** the system replaces the canonical value and the attendance snapshot and records an audit event

#### Scenario: Instructor corrects a credential after sign-in
- **WHEN** an authorized staff member supplies a new value for an attendee's prompted credential
- **THEN** the system replaces the canonical value and the attendance snapshot and records an audit event with the actor and reason

#### Scenario: Reject a value that duplicates another student
- **WHEN** the supplied value already exists for the same credential type on another student
- **THEN** the system rejects the replacement, stores no change, and reports a duplicate error

#### Scenario: Reject a value that fails the credential format
- **WHEN** the supplied value does not match the credential type's format
- **THEN** the system rejects the replacement and stores no change

### Requirement: A corrected credential re-derives reporting inclusion
The system SHALL re-derive each affected reporting-inclusion result for the attendance from the corrected credential, so a corrected valid value confers inclusion and an invalid or absent value withholds it.

#### Scenario: A valid correction confers inclusion
- **WHEN** an attendee's prompted credential is corrected to a valid value
- **THEN** the attendance's reporting inclusion for the requiring system becomes included

#### Scenario: An invalid value withholds inclusion
- **WHEN** the attendee's credential value is invalid or absent
- **THEN** the attendance's reporting inclusion for the requiring system remains excluded

### Requirement: Correction is available only while a class is open
The system SHALL permit a credential correction only while the class is open. A finalized class SHALL NOT be corrected in place: its finalized revision is immutable and is changed only through the reopen and re-finalize path. A class that is neither open nor finalized SHALL NOT be corrected.

#### Scenario: Correct an open class
- **WHEN** a credential is corrected on an open class
- **THEN** the correction is applied to the live attendance facts and is reflected when the class is next finalized

#### Scenario: Refuse a finalized class
- **WHEN** a credential correction is attempted on a finalized class
- **THEN** the system refuses the correction and leaves the finalized revision unchanged

#### Scenario: Refuse a cancelled class
- **WHEN** a credential correction is attempted on a class that is neither open nor finalized
- **THEN** the system refuses the correction

### Requirement: Staff credential correction is scoped and reasoned
The system SHALL allow an assigned instructor or elevated staff member to correct an attendee's credential only for a class the actor may operate and only for a credential the class prompts, and SHALL require a non-empty reason for the correction. An actor who is neither assigned to the class nor elevated SHALL be denied.

#### Scenario: Assigned instructor corrects an attendee
- **WHEN** an instructor assigned to the class corrects an attendee's prompted credential with a reason
- **THEN** the system applies the correction and records the actor, reason, and timestamp

#### Scenario: Elevated staff corrects any class
- **WHEN** a Training Major or Administrator corrects a prompted credential on any class with a reason
- **THEN** the system applies the correction

#### Scenario: Unrelated instructor is denied
- **WHEN** a staff member not assigned to the class and not elevated attempts a correction
- **THEN** the system denies the request without exposing roster data

#### Scenario: Reject a correction without a reason
- **WHEN** staff attempt a credential correction without a reason
- **THEN** the system rejects the request and stores no change

#### Scenario: Only prompted credentials are offered
- **WHEN** staff open the correction control for an attendee
- **THEN** only the credentials prompted by the class are offered for correction
