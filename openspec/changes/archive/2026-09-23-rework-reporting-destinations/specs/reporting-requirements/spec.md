## MODIFIED Requirements

### Requirement: Reporting systems are data-driven
The system SHALL define reporting systems as records seeded with Fire Commission, KBEMS, and MTU, and SHALL support adding more without code changes. FEMA SHALL NOT be an active reporting system.

#### Scenario: List reporting systems
- **WHEN** the system is seeded
- **THEN** the fire, kbems, and mtu reporting systems exist with stable codes and FEMA is not active

### Requirement: Requirement mapping to credentials and fields
The system SHALL map each reporting system's requirement set to the credential types or student fields it requires. A resource-usage destination MAY require no student credential or field.

#### Scenario: Fire requirement
- **WHEN** the fire reporting system's active requirement set is resolved
- **THEN** it requires the FFN credential type

#### Scenario: KBEMS requirement
- **WHEN** the kbems reporting system's active requirement set is resolved
- **THEN** it requires the KEMSIS ID credential type

#### Scenario: FEMA requirement
- **WHEN** the fema reporting system is resolved
- **THEN** it is not an active reporting system and imposes no credential requirement

#### Scenario: MTU requires no student credential
- **WHEN** the mtu reporting system's active requirement set is resolved
- **THEN** it requires no student credential type and no student field
