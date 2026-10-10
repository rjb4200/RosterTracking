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
The system SHALL store a full credential value plus a masked display suffix and SHALL display only the suffix in normal screens.

#### Scenario: Add a credential
- **WHEN** authorized staff add a credential value for a student and type
- **THEN** the system stores the value and a masked suffix and records an audit event without logging the full value

#### Scenario: Display a credential
- **WHEN** staff view a student's credentials in a normal screen
- **THEN** only the masked suffix is shown, never the full value

### Requirement: One active credential per type per student
The system SHALL allow at most one active credential of a given type for a student.

#### Scenario: Replace a credential
- **WHEN** a credential of a type already exists and staff replace it
- **THEN** the previous credential is deactivated and the new one becomes active, preserving history

### Requirement: Credential uniqueness
The system SHALL enforce that a full credential value is unique within its type.

#### Scenario: Duplicate credential value
- **WHEN** a credential value already exists for its type
- **THEN** the system rejects the new credential and reports a duplicate error

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
