## MODIFIED Requirements

### Requirement: A credential type may define a value format
The system SHALL allow a credential type to define a value format and SHALL validate a supplied value against it after normalization. The FFN credential type SHALL define the format `0000-0000` — four digits, a hyphen, and four digits. The system SHALL reject a supplied FFN that neither matches the format nor normalizes to it, and SHALL treat a stored FFN that does not match the format as not valid for Fire reporting inclusion.

#### Scenario: Accept a formatted FFN
- **WHEN** a value in the `0000-0000` form is supplied for the FFN credential type
- **THEN** the system stores it

#### Scenario: Reject a misformatted FFN
- **WHEN** a value that neither matches `0000-0000` nor normalizes to it is supplied for the FFN credential type
- **THEN** the system rejects the value and stores no change

#### Scenario: Exclude a stored non-conforming FFN from Fire inclusion
- **WHEN** a stored FFN does not match `0000-0000`
- **THEN** the system treats it as invalid for Fire inclusion without changing the stored value

## ADDED Requirements

### Requirement: An FFN is normalized to its canonical form on input
When a value is supplied for the FFN credential type, the system SHALL normalize it before validating and storing it. It SHALL accept exactly 8 digits, SHALL allow whitespace, hyphen, en dash, em dash, minus sign, or period as separators, SHALL reject any other character, SHALL preserve leading zeros, and SHALL store the canonical `dddd-dddd` form. The system SHALL normalize before computing the value used for uniqueness, so equivalent inputs collapse to one value. The system SHALL NOT repair an already-stored value.

#### Scenario: Normalize 8 digits with no separator
- **WHEN** `12345678` is supplied for the FFN credential type
- **THEN** the system stores it as `1234-5678`

#### Scenario: Normalize forgiven separators
- **WHEN** a value such as `1234 5678`, `1234.5678`, or ` 1234-5678 ` is supplied for the FFN credential type
- **THEN** the system stores it as `1234-5678`

#### Scenario: Preserve leading zeros
- **WHEN** `0123-4567` is supplied for the FFN credential type
- **THEN** the system stores it as `0123-4567` without dropping the leading zero

#### Scenario: Reject a non-separator character
- **WHEN** `abc1234-5678` is supplied for the FFN credential type
- **THEN** the system rejects the value and stores no change

#### Scenario: Reject a wrong digit count
- **WHEN** a value with 7 or 9 digits is supplied for the FFN credential type
- **THEN** the system rejects the value and stores no change

#### Scenario: Equivalent inputs collapse on uniqueness
- **WHEN** one student has `1234-5678` stored and another supplies `12345678`
- **THEN** the system treats the second input as the same value and reports a duplicate

#### Scenario: Do not repair a stored value
- **WHEN** a stored FFN is not in the canonical form
- **THEN** the system leaves the stored value unchanged
