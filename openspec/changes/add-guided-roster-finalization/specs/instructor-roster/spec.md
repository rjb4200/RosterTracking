## MODIFIED Requirements

### Requirement: Instructors can add attendance manually
The system SHALL allow an assigned instructor or elevated staff member to add attendance for an existing active student or a new class-scoped guest while the class is open or in completed roster review. Manual attendance SHALL use the class's active agency and reporting requirements, retain the staff actor and manual sign-in method, and default credited hours to the class scheduled total.

#### Scenario: Add an existing student
- **WHEN** an authorized roster operator selects an active student, an eligible agency, and all required roster data
- **THEN** the system records active manual attendance for that student with the class scheduled total as credited hours

#### Scenario: Add a guest participant
- **WHEN** an authorized roster operator enters a guest participant, an active catalog agency, and all required roster data
- **THEN** the system creates only class-scoped guest data and records active manual attendance with the class scheduled total as credited hours

#### Scenario: Add a missing participant during review
- **WHEN** an authorized roster operator adds a participant to a completed class review
- **THEN** the system records the audited manual attendance and requires finalization validation again

#### Scenario: Reject a duplicate active student
- **WHEN** an instructor attempts to add a student who already has active attendance for the class
- **THEN** the system rejects the duplicate without replacing the existing attendance

### Requirement: Attendance removal is retained and audited
The system SHALL allow an assigned instructor or elevated staff member to remove active attendance while the class is open or in completed roster review only with a non-empty reason. Removal SHALL retain the attendance, attestation, snapshots, removal actor, reason, and server timestamp rather than deleting records.

#### Scenario: Remove active attendance
- **WHEN** an authorized roster operator supplies a reason to remove active attendance
- **THEN** the system marks the attendance removed and records an audit event with the actor and reason

#### Scenario: Reject removal without a reason
- **WHEN** an instructor attempts to remove attendance without a reason
- **THEN** the system rejects the request and leaves attendance active

### Requirement: Credited hours are bounded and reasoned
The system SHALL default credited hours to the class scheduled total. An assigned instructor or elevated staff member SHALL be able to set credited hours only from zero through that scheduled total while the class is open or in completed roster review and SHALL provide a non-empty reason whenever the value differs from the default.

#### Scenario: Apply partial credit
- **WHEN** an authorized roster operator sets credited hours below the class scheduled total with a reason
- **THEN** the system retains the credited hours, reason, actor, and server timestamp and records an audit event

#### Scenario: Reject credit outside scheduled hours
- **WHEN** an instructor submits credited hours below zero or above the class scheduled total
- **THEN** the system rejects the adjustment without changing attendance

#### Scenario: Reject unexplained adjustment
- **WHEN** an instructor changes credited hours from the scheduled total without a reason
- **THEN** the system rejects the adjustment without changing attendance
