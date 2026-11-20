# Spec Delta

## ADDED Requirements

### Requirement: Training categories record an external certificate issuer

The system SHALL let staff record one optional external certificate issuer on a training category: `AHA`, `NAEMT`, or `Other`. A category with no external credential SHALL record none. The issuer SHALL be offered on the category create and edit forms for either kind and SHALL be retained with the category.

#### Scenario: Record an AHA credential

- **WHEN** staff save a training category with the external issuer set to AHA
- **THEN** the category retains AHA as its external certificate issuer

#### Scenario: Record a NAEMT credential

- **WHEN** staff save a training category with the external issuer set to NAEMT
- **THEN** the category retains NAEMT as its external certificate issuer

#### Scenario: Record an other credential

- **WHEN** staff save a training category with the external issuer set to Other
- **THEN** the category retains Other as its external certificate issuer

#### Scenario: Default to no external credential

- **WHEN** staff create a training category without choosing an external issuer
- **THEN** the category records no external certificate issuer

#### Scenario: Clear an external credential

- **WHEN** staff clear a training category's external issuer and save
- **THEN** the category records no external certificate issuer

#### Scenario: Apply to either kind

- **WHEN** staff set an external issuer on a Fire category or an EMS category
- **THEN** the category retains that issuer
