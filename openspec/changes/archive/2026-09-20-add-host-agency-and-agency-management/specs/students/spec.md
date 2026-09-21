## MODIFIED Requirements

### Requirement: Student agency memberships
The system SHALL allow a student to belong to multiple agencies and SHALL enforce at most one active primary agency per student. Memberships SHALL represent a student's preferred agencies for sign-in and SHALL NOT limit the active agencies a regular student may represent for a class.

#### Scenario: Assign multiple agencies
- **WHEN** authorized staff link a student to more than one active agency
- **THEN** the memberships are stored independently with no duplication of the student record

#### Scenario: Set a primary agency
- **WHEN** a membership is marked primary and another active primary membership exists for the same student
- **THEN** the system keeps only one active primary membership for that student

#### Scenario: Represent an agency outside memberships
- **WHEN** a regular student selects an active agency they do not belong to
- **THEN** the system accepts the selection for the class and does not reject attendance solely because a membership is missing
