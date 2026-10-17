## ADDED Requirements

### Requirement: Overdue open classes are reminded to the signing instructor

The system SHALL, on a daily schedule, identify every class that is still open and whose final scheduled session ended more than 24 hours earlier, and SHALL send one digest email to each class's signing instructor. The digest SHALL name every such class assigned to that instructor, including the class name and its scheduled date, and SHALL link to the class's review screen. The system SHALL not send a reminder before the class's final scheduled session has ended by more than 24 hours.

#### Scenario: A class crosses the threshold
- **WHEN** an open class's final scheduled session ended more than 24 hours ago
- **THEN** the next daily run includes it in the signing instructor's digest

#### Scenario: One digest per instructor
- **WHEN** a signing instructor has more than one overdue class
- **THEN** the system sends a single digest listing all of them rather than one email per class

#### Scenario: Do not remind early
- **WHEN** a class's final scheduled session ended 24 hours ago or less
- **THEN** the system does not include it in a reminder

### Requirement: Reminders repeat daily until the class is resolved

The system SHALL continue to include an overdue class in the daily digest until the class is finalized or cancelled. A class that is finalized or cancelled SHALL drop out of later digests.

#### Scenario: Still open the next day
- **WHEN** an overdue class remains open on a later day
- **THEN** it is included in that day's digest again

#### Scenario: Finalized class drops out
- **WHEN** an overdue class is finalized
- **THEN** it is not included in any later digest

#### Scenario: Cancelled class drops out
- **WHEN** an overdue class is cancelled
- **THEN** it is not included in any later digest

### Requirement: A reopened past class resumes reminding

The system SHALL include a reopened past class in the daily digest again after it returns to open.

#### Scenario: Reopen a finalized past class
- **WHEN** a finalized past class is reopened and remains open
- **THEN** the next daily run includes it in the signing instructor's digest

### Requirement: The reminder audience is the signing instructor

The system SHALL address reminders to the class's signing instructor, and SHALL NOT send them to assigned instructors who are not the signing instructor. When no signing instructor resolves, the system SHALL fall back to the class's lead instructor.

#### Scenario: Signing instructor is reminded
- **WHEN** a class has a resolved signing instructor
- **THEN** that instructor receives the reminder

#### Scenario: Non-signing instructor is not reminded
- **WHEN** a class has an assigned instructor who is not the signing instructor
- **THEN** that instructor does not receive the reminder

#### Scenario: Fall back to the lead
- **WHEN** no signing instructor resolves for an overdue class
- **THEN** the class's lead instructor receives the reminder

### Requirement: Reminder delivery is idempotent per day

The system SHALL record each reminder delivery and SHALL NOT send more than one digest to the same instructor for the same department calendar day, even if the schedule runs more than once.

#### Scenario: The schedule runs twice in one day
- **WHEN** the reminder run executes more than once on the same department calendar day for the same instructor
- **THEN** only one digest is sent and the repeat is suppressed

### Requirement: A recipient without a deliverable email is skipped

The system SHALL skip a reminder whose resolved recipient has no email address or whose account is not active, and SHALL NOT fail the run.

#### Scenario: Signing instructor has no email
- **WHEN** the resolved signing instructor has no account email
- **THEN** no reminder is sent to that instructor and the run completes

#### Scenario: Signing instructor is inactive
- **WHEN** the resolved signing instructor's account is not active
- **THEN** no reminder is sent to that instructor and the run completes

### Requirement: The reminder schedule is protected and production-only

The system SHALL expose the reminder run at a dedicated scheduled endpoint that rejects a request that does not carry the configured schedule authorization, and SHALL perform no sending outside the live production environment.

#### Scenario: Authorized schedule runs
- **WHEN** the scheduled endpoint is invoked with the configured authorization
- **THEN** the system performs the reminder run

#### Scenario: Unauthorized request is rejected
- **WHEN** the scheduled endpoint is invoked without the configured authorization
- **THEN** the system rejects the request without sending email

#### Scenario: Non-production environment
- **WHEN** the scheduled endpoint runs outside the live production environment
- **THEN** the system sends no email
