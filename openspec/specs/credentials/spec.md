# Credentials Specification

## Purpose

Store per-student credential values in a data-driven way with masked display, so new credential types can be added without schema changes and sensitive numbers are not shown in full.

## Requirements

### Requirement: Credential types are data-driven
The system SHALL define credential types as records seeded with FFN, KEMSIS ID, NREMT, and FEMA SID, and SHALL allow new types without changing the student table.

#### Scenario: List credential types
- **WHEN** the system is seeded
- **THEN** the FFN, KEMSIS ID, NREMT, and FEMA SID credential types exist with stable codes

### Requirement: Store student credentials with masked display
The system SHALL store a full credential value plus a masked display suffix and SHALL display only the suffix in normal screens. On a credential-correction surface the system SHALL display the full current value so it can be reviewed and corrected.

#### Scenario: Add a credential
- **WHEN** authorized staff add a credential value for a student and type
- **THEN** the system stores the value and a masked suffix and records an audit event without logging the full value

#### Scenario: Display a credential
- **WHEN** staff view a student's credentials in a normal screen
- **THEN** only the masked suffix is shown, never the full value

#### Scenario: Display a credential on a correction surface
- **WHEN** a credential-correction surface is shown for a prompted credential
- **THEN** the current full value is displayed for review and correction

### Requirement: One active credential per type per student
The system SHALL allow at most one active credential of a given type for a student. When a credential of a type already exists and is replaced, the system SHALL update that credential's value, masked suffix, and lookup hash in place and record an audit event.

#### Scenario: Replace a credential
- **WHEN** a credential of a type already exists and is replaced
- **THEN** the system updates the existing credential in place and records an audit event

### Requirement: Credential uniqueness
The system SHALL enforce that a full credential value is unique within its type.

#### Scenario: Duplicate credential value
- **WHEN** a credential value already exists for its type
- **THEN** the system rejects the new credential and reports a duplicate error

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
