## ADDED Requirements

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
