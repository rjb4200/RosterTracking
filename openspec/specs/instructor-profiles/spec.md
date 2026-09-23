# instructor-profiles Specification

## Purpose
Maintain the instructor credential attributes that official rosters and completion certificates must print, under an ownership model where instructors keep their own values current and Administrators can correct any record.
## Requirements
### Requirement: Instructor profile attributes are stored
The system SHALL store an optional Fire Commission firefighter number (FFN), an optional Fire Instructor certification level, and an optional state EMS provider number for each staff user. The certification level SHALL be one of 1, 2, or 3 when present.

#### Scenario: Store instructor credential attributes
- **WHEN** an authorized editor saves a Fire Instructor level of 2 for a staff user
- **THEN** the system stores the level and makes it available to official output

#### Scenario: Reject an invalid certification level
- **WHEN** an editor submits a Fire Instructor level other than 1, 2, or 3
- **THEN** the system rejects the value and stores no change

#### Scenario: Accept a missing optional attribute
- **WHEN** a staff user has no EMS provider number recorded
- **THEN** the system leaves that attribute empty without blocking other profile values

### Requirement: Instructors maintain their own profile
The system SHALL let an authenticated staff user view and edit their own profile attributes. It SHALL reject a self-edit that attempts to change account-level fields such as username, role, or account status.

#### Scenario: Instructor edits their own profile
- **WHEN** an authenticated instructor saves their own FFN, certification level, or EMS provider number
- **THEN** the system stores the change and records an audit event

#### Scenario: Self-edit cannot change account fields
- **WHEN** an instructor submits a profile form that also alters their role or account status
- **THEN** the system applies no role or status change and keeps the account unchanged

### Requirement: Administrators edit any profile
The system SHALL let an active Administrator view and edit the profile attributes of any staff user.

#### Scenario: Administrator corrects a profile
- **WHEN** an Administrator saves a corrected FFN for another staff user
- **THEN** the system stores the change and records the acting Administrator

### Requirement: Profile changes are audited
The system SHALL record an audit event identifying the acting user, the affected staff user, and the changed profile attributes. The audit event SHALL NOT contain full credential values beyond the values needed to identify the change.

#### Scenario: Record a profile change
- **WHEN** a profile attribute is added, changed, or cleared
- **THEN** the system records an audit event with the actor, the affected staff user, and which attributes changed

### Requirement: Firefighter number is unique when present
The system SHALL NOT allow two staff users to hold the same Fire Commission firefighter number.

#### Scenario: Reject a duplicate firefighter number
- **WHEN** an editor saves an FFN already assigned to another staff user
- **THEN** the system rejects the change and reports the conflict

