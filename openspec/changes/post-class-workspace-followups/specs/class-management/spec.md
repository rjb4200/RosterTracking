## MODIFIED Requirements

### Requirement: Classes have assigned instructors

The system SHALL let authorized staff assign active staff users as instructors, identify at most one lead instructor for each class, change which instructor is the lead, and remove an instructor assignment. Assigning an instructor as the lead SHALL make that instructor the only lead. The system SHALL refuse to remove a class's only lead instructor, and SHALL re-check the Fire instructor requirement when an assignment changes for a class that reports to Fire.

#### Scenario: Assign a lead instructor
- **WHEN** staff assign an active instructor as the lead instructor for a class
- **THEN** the instructor assignment is stored as the class lead

#### Scenario: Replace the lead instructor
- **WHEN** staff select a different instructor as the lead for the same class
- **THEN** the newly selected instructor becomes the only lead assignment

#### Scenario: Assign an assisting instructor
- **WHEN** staff add an active instructor to a class without making them the lead
- **THEN** the instructor is stored as a non-lead assignment and the existing lead is unchanged

#### Scenario: Remove an instructor assignment
- **WHEN** staff remove an assigned instructor who is not the class's only lead
- **THEN** the assignment is removed

#### Scenario: Refuse removing the only lead
- **WHEN** staff attempt to remove the class's only lead instructor
- **THEN** the system refuses and keeps the assignment
