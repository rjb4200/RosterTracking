# Spec Delta

## MODIFIED Requirements

### Requirement: Classes have assigned instructors

The system SHALL assign active staff as exactly one lead instructor, zero or one assistant instructor, and any number of additional instructors. The assistant SHALL be the second instructor of record on official forms; additional instructors SHALL support class access and reporting without an official form slot. Each person SHALL hold at most one role. Assigning a lead SHALL replace the previous lead. Assigning an assistant SHALL replace the previous assistant. The class SHALL retain a lead.

#### Scenario: Assign a lead instructor
- **WHEN** staff assign an active instructor as the lead instructor for a class
- **THEN** the instructor assignment is stored as the class lead

#### Scenario: Replace the lead instructor
- **WHEN** staff select a different instructor as the lead for the same class
- **THEN** the newly selected instructor becomes the only lead assignment and the previous lead is no longer assigned

#### Scenario: Assign an assistant instructor
- **WHEN** staff assign an active instructor other than the lead as the assistant instructor for a class
- **THEN** the instructor assignment is stored as the class assistant instructor

#### Scenario: Add additional instructors
- **WHEN** staff add instructors beyond the lead and assistant
- **THEN** the class records them as additional instructors without changing the lead or assistant

#### Scenario: Remove an additional instructor
- **WHEN** staff remove an additional instructor from an open class
- **THEN** the class no longer records that instructor and keeps the lead and assistant assignments

#### Scenario: Promote an additional instructor to assistant
- **WHEN** staff choose an additional instructor as the assistant
- **THEN** the class records that person as the assistant and no longer counts them as additional

#### Scenario: Refuse to leave the class without a lead
- **WHEN** staff attempt to clear the lead without selecting a replacement
- **THEN** the system refuses and keeps the lead assignment

#### Scenario: Reject one person holding two roles
- **WHEN** staff choose the lead as assistant or additional, or choose the assistant as additional
- **THEN** the system rejects the change and keeps the roles distinct

## ADDED Requirements

### Requirement: Fire classes require a fire-qualified lead

The system SHALL require a Fire class's lead instructor to be a fire instructor: a staff member with a valid FFN (`0000-0000`) and Fire Instructor level 1, 2, or 3. When Fire is added or a Fire class's instructors change, the system SHALL validate the resulting lead and SHALL reject a non-fire lead even when an assistant or additional instructor is fire-qualified. Assistants and additional instructors MAY be non-fire.

#### Scenario: Reject adding Fire with a non-fire lead
- **WHEN** staff add the Fire reporting system to a class whose lead is not a fire instructor
- **THEN** the system rejects the change and identifies that the lead must be a fire instructor

#### Scenario: Allow Fire with a fire-qualified lead
- **WHEN** staff add Fire to a class whose lead is a fire instructor
- **THEN** the system saves the change

#### Scenario: Reject replacing the lead with a non-fire instructor
- **WHEN** staff change a Fire class's lead to an instructor who is not a fire instructor
- **THEN** the system rejects the change even if an assistant or additional instructor is fire-qualified

#### Scenario: Allow a non-fire assistant or additional instructor
- **WHEN** staff assign a non-fire instructor as assistant or additional instructor on a Fire class whose lead is fire-qualified
- **THEN** the system saves the assignment

#### Scenario: Block an existing non-fire lead
- **WHEN** an open Fire class's lead is not fire-qualified
- **THEN** the system refuses to save or finalize the class until a fire-qualified lead is selected

## REMOVED Requirements

### Requirement: Fire reporting and instructor changes require a fire instructor
**Reason**: Replaced by the lead-only signing model, where the lead must be fire-qualified.
**Migration**: Assign a fire-qualified lead to every Fire class and update validation to check the lead rather than the whole assignment set.
