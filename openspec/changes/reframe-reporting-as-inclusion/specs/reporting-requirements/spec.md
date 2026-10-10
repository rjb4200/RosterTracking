## REMOVED Requirements

### Requirement: Requirement mapping to credentials and fields
**Reason**: Reporting systems no longer impose credentials that gate sign-in. Fire's FFN is now an inclusion rule for the Fire roster rather than a credential every attendee must supply, and KBEMS imposes no student credential at all.
**Migration**: Replaced by report inclusion rules: the Fire reporting system includes only attendees with a valid FFN; KBEMS and MTU impose no student credential.

### Requirement: Resolve requirements for selected systems
**Reason**: Resolving the union of required credentials and blocking sign-in until they were collected wrongly blocked EMS-only attendees on combined Fire and EMS classes and requested a KEMSIS number from students who do not have one.
**Migration**: Resolve report inclusion rules per selected reporting system; student sign-in is never gated by credentials.

## ADDED Requirements

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
