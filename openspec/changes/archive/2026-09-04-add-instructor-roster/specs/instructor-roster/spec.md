## Purpose

Give assigned instructors a staff-only tablet and desktop roster for managing class attendance and credited hours without losing the facts captured during student sign-in.

## ADDED Requirements

### Requirement: Assigned instructors can view a live class roster
The system SHALL allow an assigned instructor to view a staff-only roster for an open or completed class. The roster SHALL show active and removed attendance separately, each participant's name, participant type, represented agency, sign-in method, credited hours, and removal state when applicable.

#### Scenario: View active attendance
- **WHEN** an assigned instructor opens an open class roster
- **THEN** the system shows its active regular and guest attendance with their represented agencies and credited hours

#### Scenario: View retained removal history
- **WHEN** an assigned instructor views a class with removed attendance
- **THEN** the system shows removed attendance separately with its removal reason and does not present it as active participation

#### Scenario: Reject an unassigned instructor
- **WHEN** a staff member who is not assigned to the class requests its roster
- **THEN** the system denies access without exposing roster data

### Requirement: Instructors can add attendance manually
The system SHALL allow an assigned instructor to add attendance for an existing active student or a new class-scoped guest. Manual attendance SHALL use the class's active agency and reporting requirements, retain the staff actor and manual sign-in method, and default credited hours to the class scheduled total.

#### Scenario: Add an existing student
- **WHEN** an assigned instructor selects an active student, an eligible agency, and all required roster data
- **THEN** the system records active manual attendance for that student with the class scheduled total as credited hours

#### Scenario: Add a guest participant
- **WHEN** an assigned instructor enters a guest participant, an active catalog agency, and all required roster data
- **THEN** the system creates only class-scoped guest data and records active manual attendance with the class scheduled total as credited hours

#### Scenario: Reject a duplicate active student
- **WHEN** an instructor attempts to add a student who already has active attendance for the class
- **THEN** the system rejects the duplicate without replacing the existing attendance

### Requirement: Attendance removal is retained and audited
The system SHALL allow an assigned instructor to remove active attendance only with a non-empty reason. Removal SHALL retain the attendance, attestation, snapshots, removal actor, reason, and server timestamp rather than deleting records.

#### Scenario: Remove active attendance
- **WHEN** an assigned instructor supplies a reason to remove active attendance
- **THEN** the system marks the attendance removed and records an audit event with the actor and reason

#### Scenario: Reject removal without a reason
- **WHEN** an instructor attempts to remove attendance without a reason
- **THEN** the system rejects the request and leaves attendance active

### Requirement: Credited hours are bounded and reasoned
The system SHALL default credited hours to the class scheduled total. An assigned instructor SHALL be able to set credited hours only from zero through that scheduled total and SHALL provide a non-empty reason whenever the value differs from the default.

#### Scenario: Apply partial credit
- **WHEN** an assigned instructor sets credited hours below the class scheduled total with a reason
- **THEN** the system retains the credited hours, reason, actor, and server timestamp and records an audit event

#### Scenario: Reject credit outside scheduled hours
- **WHEN** an instructor submits credited hours below zero or above the class scheduled total
- **THEN** the system rejects the adjustment without changing attendance

#### Scenario: Reject unexplained adjustment
- **WHEN** an instructor changes credited hours from the scheduled total without a reason
- **THEN** the system rejects the adjustment without changing attendance

### Requirement: Instructor roster interactions support operational devices
The system SHALL provide the live roster and attendance-management actions in layouts usable on tablet and desktop viewports, with accessible confirmation and error feedback for destructive attendance changes.

#### Scenario: Use the roster on a tablet
- **WHEN** an assigned instructor opens the roster on a tablet viewport
- **THEN** the active roster, participant actions, and confirmation controls remain usable without horizontal page overflow

#### Scenario: Confirm a removal accessibly
- **WHEN** an instructor initiates attendance removal
- **THEN** the system presents the reason input and confirmation state with keyboard-accessible controls and announced validation feedback
