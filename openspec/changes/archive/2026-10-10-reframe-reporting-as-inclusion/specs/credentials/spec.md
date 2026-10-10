## ADDED Requirements

### Requirement: A credential type may define a value format
The system SHALL allow a credential type to define a value format and SHALL validate a supplied value against it. The FFN credential type SHALL define the format `0000-0000` — four digits, a hyphen, and four digits. The system SHALL reject a supplied FFN that does not match the format and SHALL treat a stored FFN that does not match as not valid for Fire reporting inclusion.

#### Scenario: Accept a formatted FFN
- **WHEN** a value in the `0000-0000` form is supplied for the FFN credential type
- **THEN** the system stores it

#### Scenario: Reject a misformatted FFN
- **WHEN** a value that does not match `0000-0000` is supplied for the FFN credential type
- **THEN** the system rejects the value and stores no change

#### Scenario: Exclude a stored non-conforming FFN from Fire inclusion
- **WHEN** a stored FFN does not match `0000-0000`
- **THEN** the system treats it as invalid for Fire inclusion without changing the stored value
