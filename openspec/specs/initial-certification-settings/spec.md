# Initial-Certification Settings Specification

## Purpose

Hold the single TEI number that prefixes KBEMS initial-certification course numbers, so the expected format can change without a code change while only administrators can alter it.

## Requirements

### Requirement: Initial-certification TEI number is a single global setting

The system SHALL hold one global TEI number that prefixes initial-certification course numbers, defaulting to `126` when unset. The system SHALL let only an administrator change the TEI number, and SHALL offer the editing control as a collapsed control on the Agencies page.

#### Scenario: Default TEI number
- **WHEN** no administrator has set a TEI number
- **THEN** the system uses `126` as the initial-certification prefix

#### Scenario: Administrator changes the TEI number
- **WHEN** an administrator expands the initial-certification settings on the Agencies page and saves a new TEI number
- **THEN** the system uses the new value as the expected prefix for initial-certification course numbers

#### Scenario: A non-administrator cannot change the TEI number
- **WHEN** a staff member who is not an administrator views the Agencies page
- **THEN** the initial-certification settings control is not offered and a save is refused
