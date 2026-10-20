## ADDED Requirements

### Requirement: A class has exactly one lead and at most one assistant

The system SHALL keep exactly one lead instructor and zero or one assistant instructor for each class while it is open. Authorized staff SHALL be able to replace the lead and to set, change, or clear the assistant. Replacing the lead SHALL remove the previous lead assignment rather than demoting it into the assistant slot. Setting or changing the assistant SHALL NOT change the lead. An instructor SHALL NOT hold both roles.

#### Scenario: Replace the lead instructor
- **WHEN** authorized staff choose a different instructor as the lead for an open class
- **THEN** the newly chosen instructor is the only lead and the previous lead is no longer assigned

#### Scenario: Add an assistant instructor
- **WHEN** authorized staff choose an active staff member who is not the lead as the assistant for an open class
- **THEN** the class records that instructor as its assistant and keeps the lead unchanged

#### Scenario: Change the assistant instructor
- **WHEN** authorized staff choose a different instructor as the assistant
- **THEN** the class records the newly chosen instructor as its only assistant

#### Scenario: Clear the assistant instructor
- **WHEN** authorized staff clear the assistant for an open class
- **THEN** the class is left with its lead and no assistant

#### Scenario: Replace the assistant with the lead
- **WHEN** authorized staff choose the current assistant as the new lead
- **THEN** the assistant becomes the only lead and the class has no assistant, because the previous lead is removed

#### Scenario: Reject the lead as the assistant
- **WHEN** authorized staff choose the current lead as the assistant
- **THEN** the system rejects the change and keeps the roles distinct

### Requirement: Fire reporting and instructor changes require a fire instructor

When authorized staff add the Fire reporting system to a class, or change its assigned lead or assistant while Fire is selected, the system SHALL ensure the resulting assignment set contains at least one fire instructor — a staff member with both a valid FFN (`0000-0000`) and a Fire Instructor certification level (1, 2, or 3) — and SHALL reject the change otherwise. Validation SHALL apply to the assignment set that will exist after the write, not the current set plus the newly selected instructor. This SHALL prevent bypassing the Fire guard through an edit and SHALL prevent a temporary invalid state during a combined change.

#### Scenario: Reject adding Fire with no fire instructor
- **WHEN** staff add the Fire reporting system to a class whose assigned instructors include no fire instructor
- **THEN** the system rejects the change and identifies that a fire instructor is required

#### Scenario: Reject removing the only fire instructor
- **WHEN** staff change or clear the assigned instructor who is the class's only fire instructor while Fire is selected
- **THEN** the system rejects the change and identifies that a fire instructor is required

#### Scenario: Allow a change that keeps a fire instructor
- **WHEN** staff change the lead or assistant such that at least one assigned instructor remains a fire instructor
- **THEN** the system saves the change

#### Scenario: Validate the resulting set
- **WHEN** staff replace a fire-eligible lead with a non-fire lead while the assistant is not fire-eligible
- **THEN** the system rejects the change even though the outgoing lead is still assigned at validation time

## MODIFIED Requirements

### Requirement: Classes have assigned instructors

The system SHALL let authorized staff assign active staff users as instructors and identify exactly one lead instructor and at most one assistant instructor for each class. Assigning a lead SHALL replace the previous lead. Assigning an assistant SHALL replace any previous assistant. The system SHALL refuse to leave the class without a lead.

#### Scenario: Assign a lead instructor
- **WHEN** staff assign an active instructor as the lead instructor for a class
- **THEN** the instructor assignment is stored as the class lead

#### Scenario: Replace the lead instructor
- **WHEN** staff select a different instructor as the lead for the same class
- **THEN** the newly selected instructor becomes the only lead assignment and the previous lead is no longer assigned

#### Scenario: Assign an assistant instructor
- **WHEN** staff assign an active instructor other than the lead as the assistant instructor for a class
- **THEN** the instructor assignment is stored as the class assistant instructor

#### Scenario: Refuse to leave the class without a lead
- **WHEN** staff attempt to clear the lead without selecting a replacement
- **THEN** the system refuses and keeps the lead assignment

## REMOVED Requirements

### Requirement: Fire reporting and instructor changes require valid FFNs
**Reason**: Replaced by the requirement that a Fire class retain at least one fire instructor, so a class may be led by an instructor who is not a fire instructor when a fire-qualified assistant is present.
**Migration**: Use "Fire reporting and instructor changes require a fire instructor".
