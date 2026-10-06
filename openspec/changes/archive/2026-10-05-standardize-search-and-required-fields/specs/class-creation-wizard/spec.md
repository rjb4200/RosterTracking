## ADDED Requirements

### Requirement: Advancing a step identifies missing required inputs

When staff choose to advance from a wizard step, the system SHALL advance only when the step's required inputs are present; otherwise it SHALL keep staff on the step and identify each missing required input rather than silently preventing advancement.

#### Scenario: Block an incomplete step with identification
- **WHEN** staff choose Next with required inputs missing on the current step
- **THEN** the system stays on the step, highlights the missing required inputs, and does not advance

#### Scenario: Advance a complete step
- **WHEN** all required inputs for the current step are present and staff choose Next
- **THEN** the system advances to the next step
