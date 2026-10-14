# Site Management Specification

## Purpose

Maintain one department training-site catalog with the address details needed to
contact a site and arrange training, resolved consistently when a class or an
inline creation refers to a site by name.

## Requirements

### Requirement: Training site records carry an address

The system SHALL store for each training site a name and an optional address consisting of a street address, a city, a state, and a ZIP code. The name SHALL be required.

#### Scenario: Create a site with an address
- **WHEN** staff create a training site with a name and address details
- **THEN** the system stores the site with those details

#### Scenario: Name is required
- **WHEN** staff create a training site without a name
- **THEN** the system rejects the create and identifies the missing name

### Requirement: Creating a site resolves an existing name

The system SHALL keep training-site names unique among active sites, ignoring letter case and surrounding whitespace. When staff create a site whose name matches an existing active site, the system SHALL reuse that site without creating a duplicate or changing it. When the matching site is archived or inactive, the system SHALL revive or reactivate it.

#### Scenario: Reuse an active site
- **WHEN** staff create a site whose name matches an existing active site apart from case or surrounding whitespace
- **THEN** the system reuses the existing site without creating a duplicate or changing it

#### Scenario: Revive an archived site
- **WHEN** staff create a site whose name matches an archived or inactive site
- **THEN** the system revives or reactivates that site
