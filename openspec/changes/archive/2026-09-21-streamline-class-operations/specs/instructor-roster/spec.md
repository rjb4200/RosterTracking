## MODIFIED Requirements

### Requirement: Assigned instructors can view a live class roster
The system SHALL show an assigned instructor the class roster on the class page while a class is open and on the review step while it is completed. The roster SHALL show active and removed attendance separately, each participant's name, participant type, represented agency, sign-in method, credited hours, and removal state when applicable. The system SHALL NOT provide a separate standalone roster page.

#### Scenario: View active attendance
- **WHEN** an assigned instructor opens an open class
- **THEN** the class page shows its active regular and guest attendance with their represented agencies and credited hours

#### Scenario: View retained removal history
- **WHEN** an assigned instructor views the review step for a class with removed attendance
- **THEN** the system shows removed attendance separately with its removal reason and does not present it as active participation

#### Scenario: Reject an unassigned instructor
- **WHEN** a staff member who is not assigned to the class requests its roster
- **THEN** the system denies access without exposing roster data

### Requirement: Attendance removal is retained and audited
The system SHALL allow an assigned instructor or elevated staff member to remove active attendance at the finish-attendance step, only with a non-empty reason. Removal SHALL retain the attendance, attestation, snapshots, removal actor, reason, and server timestamp rather than deleting records.

#### Scenario: Remove active attendance
- **WHEN** an authorized operator supplies a reason to remove active attendance at the finish-attendance step
- **THEN** the system marks the attendance removed and records an audit event with the actor and reason

#### Scenario: Reject removal without a reason
- **WHEN** an instructor attempts to remove attendance without a reason
- **THEN** the system rejects the request and leaves attendance active

### Requirement: Credited hours are bounded and reasoned
The system SHALL default credited hours to the class scheduled total. An assigned instructor or elevated staff member SHALL be able to set credited hours only from zero through that scheduled total at the finish-attendance step and SHALL provide a non-empty reason whenever the value differs from the default.

#### Scenario: Apply partial credit
- **WHEN** an authorized roster operator sets credited hours below the class scheduled total with a reason at the finish-attendance step
- **THEN** the system retains the credited hours, reason, actor, and server timestamp and records an audit event

#### Scenario: Reject credit outside scheduled hours
- **WHEN** an instructor submits credited hours below zero or above the class scheduled total
- **THEN** the system rejects the adjustment without changing attendance

#### Scenario: Reject unexplained adjustment
- **WHEN** an instructor changes credited hours from the scheduled total without a reason
- **THEN** the system rejects the adjustment without changing attendance

### Requirement: Command-screen roster access
The system SHALL make active roster information and manual attendance entry available on the class page to assigned instructors and elevated staff with department class access.

#### Scenario: Elevated staff manage department attendance
- **WHEN** elevated staff open a department class they are not assigned to
- **THEN** they can view and manage its active roster on the class page
