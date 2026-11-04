## MODIFIED Requirements

### Requirement: One certificate per participant

The system SHALL generate exactly one completion certificate for each active instructor-so-far roster entry in a KBEMS class, including hidden entries whose `include_in_total` is false, except an attendance explicitly excluded from the certificate during initial-certification finalization.

#### Scenario: Generate for every participant

- **WHEN** completion certificates are requested for a finalized class
- **THEN** every active attendance that is not certificate-excluded receives one certificate

#### Scenario: Exclude removed attendance

- **WHEN** an attendance was removed before finalization
- **THEN** it receives no certificate

#### Scenario: Exclude a certificate-disposition participant

- **WHEN** an active attendance has an Exclude certificate disposition
- **THEN** it remains on the roster and transcript but receives no certificate
