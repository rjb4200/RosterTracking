## MODIFIED Requirements

### Requirement: Regular attendance references the student record
The system SHALL record regular attendance against one active student and one open class. A student SHALL have at most one active attendance record for the same class. An initial-certification program class SHALL allow additional daily check-ins for that attendance.

#### Scenario: Sign in a regular student
- **WHEN** an identified student completes the class sign-in workflow
- **THEN** the system records attendance linked to that student and class

#### Scenario: Prevent duplicate regular attendance
- **WHEN** the same student submits attendance again for the same non-initial class
- **THEN** the system returns the existing successful attendance result instead of creating a duplicate

#### Scenario: Add a daily check-in
- **WHEN** the same student submits attendance on a later date for the same initial-certification class
- **THEN** the system adds a check-in to the existing attendance instead of creating a second attendance

## ADDED Requirements

### Requirement: Initial-certification daily check-ins

For an initial-certification program class, the system SHALL allow one check-in per active student per department-calendar date. The first scan SHALL create the attendance and the first check-in. A later date SHALL add a check-in without creating another attendance. A same-date scan SHALL return the existing check-in without creating a duplicate.

#### Scenario: Check in on a later program date

- **WHEN** the same student scans on a later date in the initial-certification class
- **THEN** the system records a new daily check-in

#### Scenario: Repeat the same program date

- **WHEN** the student scans again on a date that already has their check-in
- **THEN** the system returns the existing check-in and records no duplicate

#### Scenario: Keep non-initial behavior

- **WHEN** a student scans again for a non-initial class
- **THEN** the system still returns `already_signed_in`
