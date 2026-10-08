# Instructor Roster Specification

## Purpose

Give assigned instructors a staff-only tablet and desktop roster for managing class attendance and credited hours without losing the facts captured during student sign-in.

## Requirements

### Requirement: Assigned instructors can view a live class roster
The system SHALL show an assigned instructor the class roster on the class page while a class is open and on the review screen while it is open or finalized. The roster SHALL show active and removed attendance separately, each participant's name, participant type, represented agency, sign-in method, credited hours, and removal state when applicable. The system SHALL NOT provide a separate standalone roster page.

#### Scenario: View active attendance
- **WHEN** an assigned instructor opens an open class
- **THEN** the class page shows its active regular and guest attendance with their represented agencies and credited hours

#### Scenario: View retained removal history
- **WHEN** an assigned instructor views the review screen for a class with removed attendance
- **THEN** the system shows removed attendance separately with its removal reason and does not present it as active participation

#### Scenario: Reject an unassigned instructor
- **WHEN** a staff member who is not assigned to the class requests its roster
- **THEN** the system denies access without exposing roster data

### Requirement: Attendance removal is retained and audited
The system SHALL allow an assigned instructor or elevated staff member to remove active attendance at the finalization step, only with a non-empty reason. Removal SHALL retain the attendance, attestation, snapshots, removal actor, reason, and server timestamp rather than deleting records.

#### Scenario: Remove active attendance
- **WHEN** an authorized operator supplies a reason to remove active attendance at the finalization step
- **THEN** the system marks the attendance removed and records an audit event with the actor and reason

#### Scenario: Reject removal without a reason
- **WHEN** an instructor attempts to remove attendance without a reason
- **THEN** the system rejects the request and leaves attendance active

### Requirement: Credited hours are bounded and reasoned
The system SHALL default credited hours to the class scheduled total. An assigned instructor or elevated staff member SHALL be able to set credited hours only from zero through that scheduled total at the finalization step and SHALL provide a non-empty reason whenever the value differs from the default.

#### Scenario: Apply partial credit
- **WHEN** an authorized roster operator sets credited hours below the class scheduled total with a reason at the finalization step
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

### Requirement: Command-screen roster access
The system SHALL make active roster information available on the class page to assigned instructors and elevated staff with department class access.

#### Scenario: Elevated staff manage department attendance
- **WHEN** elevated staff open a department class they are not assigned to
- **THEN** they can view its active roster on the class page
