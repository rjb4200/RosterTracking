## MODIFIED Requirements

### Requirement: Credited hours are bounded and reasoned
The system SHALL default credited hours to the class scheduled total. An assigned instructor or elevated staff member SHALL be able to set credited hours only from zero through that scheduled total at the finalization step and SHALL provide a non-empty reason whenever the value differs from the default. When the class scheduled total increases while the class is open, the system SHALL credit every active participant whose credited hours equal the previous total with the new total and SHALL leave participants credited below the previous total unchanged.

#### Scenario: Apply partial credit
- **WHEN** an authorized roster operator sets credited hours below the class scheduled total with a reason at the finalization step
- **THEN** the system retains the credited hours, reason, actor, and server timestamp and records an audit event

#### Scenario: Reject credit outside scheduled hours
- **WHEN** an instructor submits credited hours below zero or above the class scheduled total
- **THEN** the system rejects the adjustment without changing attendance

#### Scenario: Reject unexplained adjustment
- **WHEN** an instructor changes credited hours from the scheduled total without a reason
- **THEN** the system rejects the adjustment without changing attendance

#### Scenario: Follow a raised scheduled total
- **WHEN** the class scheduled total increases and a participant was credited at the previous total
- **THEN** the system credits that participant at the new total

#### Scenario: Retain a partial credit when the total rises
- **WHEN** the class scheduled total increases and a participant was credited below the previous total with a reason
- **THEN** the system leaves that participant's credited hours and reason unchanged
