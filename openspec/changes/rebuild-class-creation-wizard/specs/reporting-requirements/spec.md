## MODIFIED Requirements

### Requirement: Resolve requirements for selected systems
The system SHALL resolve the union of required credential types and student fields for a given set of reporting systems and show that union to staff before a class is created.

#### Scenario: Fire plus KBEMS
- **WHEN** requirements are resolved for fire and kbems together
- **THEN** the required credential types include both FFN and KEMSIS ID

#### Scenario: Review selected reporting requirements
- **WHEN** staff select reporting systems during class creation
- **THEN** the system identifies the student credentials and fields required by the selected destinations before they submit the class
