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

### Requirement: A training site can be the default for new classes

The system SHALL let an Administrator designate at most one active training site as the default for new classes. The default flag SHALL be settable from the standalone New site and Edit site forms and SHALL be hidden from staff who are not Administrators. Designating a site as the default SHALL clear the previous default in the same transaction. Clearing the default SHALL leave the department with no default training site. The system SHALL show an inline warning before saving when the action would replace or clear the current default. While a site is the default, the system SHALL refuse to deactivate or archive it. The Sites list SHALL identify the default site.

#### Scenario: Set a default while creating a site
- **WHEN** an Administrator creates a site with the default checkbox selected
- **THEN** the site is stored as the default training site

#### Scenario: Set a default while editing a site
- **WHEN** an Administrator edits an active site and selects the default checkbox
- **THEN** the site is stored as the default training site

#### Scenario: Replace the previous default
- **WHEN** an Administrator saves a different site as the default while another site is already the default
- **THEN** the previous site is no longer the default and the newly saved site is the only default

#### Scenario: Clear the default
- **WHEN** an Administrator unchecks the checkbox on the current default site and saves
- **THEN** no training site is the default and new classes start without a preselected site

#### Scenario: Warn before replacing or clearing
- **WHEN** an Administrator changes the default checkbox in a way that would replace or clear the current default
- **THEN** the form shows an inline warning naming the current default before the change is saved

#### Scenario: Block deactivation while default
- **WHEN** staff attempt to deactivate the default training site
- **THEN** the system refuses the change and requires the default to be cleared first

#### Scenario: Block archiving while default
- **WHEN** staff attempt to archive the default training site
- **THEN** the system refuses the change and requires the default to be cleared first

#### Scenario: Non-administrator cannot set the default
- **WHEN** a staff member who is not an Administrator submits a site update that sets the default flag
- **THEN** the system rejects the default change and leaves the existing default unchanged

#### Scenario: Identify the default in the list
- **WHEN** staff view the Sites list
- **THEN** the default training site is visibly identified as the default

