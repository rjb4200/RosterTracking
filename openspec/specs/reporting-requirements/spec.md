# Reporting Requirements Specification

## Purpose

Define reporting systems and versioned requirement sets so the application can determine required student credentials and fields from the reporting systems selected for a class, without hard-coding checks.

## Requirements

### Requirement: Reporting systems are data-driven
The system SHALL define reporting systems as records seeded with Fire Commission, KBEMS, and FEMA, and SHALL support adding more without code changes.

#### Scenario: List reporting systems
- **WHEN** the system is seeded
- **THEN** the fire, kbems, and fema reporting systems exist with stable codes

### Requirement: Versioned reporting requirement sets
The system SHALL store requirement sets per reporting system with a version number and effective dates, and SHALL mark at most one set active for a system at a time.

#### Scenario: Seed version one
- **WHEN** the system is seeded
- **THEN** each reporting system has an active version-one requirement set

### Requirement: Requirement mapping to credentials and fields
The system SHALL map each reporting system's requirement set to the credential types or student fields it requires.

#### Scenario: Fire requirement
- **WHEN** the fire reporting system's active requirement set is resolved
- **THEN** it requires the FFN credential type

#### Scenario: KBEMS requirement
- **WHEN** the kbems reporting system's active requirement set is resolved
- **THEN** it requires the KEMSIS ID credential type

#### Scenario: FEMA requirement
- **WHEN** the fema reporting system's active requirement set is resolved
- **THEN** it requires the FEMA SID credential type

### Requirement: Resolve requirements for selected systems
The system SHALL resolve the union of required credential types and student fields for a given set of reporting systems and show that union to staff before a class is created.

#### Scenario: Fire plus KBEMS
- **WHEN** requirements are resolved for fire and kbems together
- **THEN** the required credential types include both FFN and KEMSIS ID

#### Scenario: Review selected reporting requirements
- **WHEN** staff select reporting systems during class creation
- **THEN** the system identifies the student credentials and fields required by the selected destinations before they submit the class
