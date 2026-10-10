# Reporting Requirements Specification

## Purpose

Define reporting systems and versioned inclusion rules so the application can determine which attendees belong on each destination's output from the reporting systems selected for a class, without hard-coding checks.
## Requirements
### Requirement: Reporting systems are data-driven
The system SHALL define reporting systems as records seeded with Fire Commission, KBEMS, and MTU, and SHALL support adding more without code changes. FEMA SHALL NOT be an active reporting system.

#### Scenario: List reporting systems
- **WHEN** the system is seeded
- **THEN** the fire, kbems, and mtu reporting systems exist with stable codes and FEMA is not active

### Requirement: Versioned reporting requirement sets
The system SHALL store requirement sets per reporting system with a version number and effective dates, and SHALL mark at most one set active for a system at a time.

#### Scenario: Seed version one
- **WHEN** the system is seeded
- **THEN** each reporting system has an active version-one requirement set

### Requirement: Reporting systems define report inclusion rules
The system SHALL define, for each reporting system, the rule that decides which attendees are included on that destination's output. The Fire reporting system SHALL include only attendees whose FFN is present and in the valid `0000-0000` format. The KBEMS reporting system SHALL include every attendee and SHALL require no student credential. The MTU reporting system SHALL include no attendees because it records resource usage only. A reporting system that imposes no student credential SHALL NOT block or omit an attendee.

#### Scenario: Fire includes only valid-FFN attendees
- **WHEN** the Fire reporting system's active inclusion rule is resolved for a class
- **THEN** an attendee with a present, valid FFN is included on the Fire output and an attendee without one is excluded from it

#### Scenario: KBEMS includes every attendee
- **WHEN** the KBEMS reporting system's active inclusion rule is resolved for a class
- **THEN** every attendee is included and no attendee is required to supply a credential as a condition of inclusion

#### Scenario: MTU includes no attendees
- **WHEN** the MTU reporting system's active inclusion rule is resolved for a class
- **THEN** no attendee is included because MTU records resource usage only

### Requirement: Inclusion rules are resolved from selected systems
The system SHALL resolve the effective inclusion rules for the reporting systems selected on a class and SHALL show staff, before a class is created, that no student credential is required to sign in and which attribute, if any, places an attendee on each selected output.

#### Scenario: Fire plus KBEMS class
- **WHEN** a class selects Fire and KBEMS together
- **THEN** a valid FFN places an attendee on the Fire output, every attendee appears on the KBEMS output, and no attendee is blocked at sign-in

#### Scenario: Review selected reporting inclusion
- **WHEN** staff select reporting systems during class creation
- **THEN** the system shows which attribute, if any, places an attendee on each selected output before they submit the class

