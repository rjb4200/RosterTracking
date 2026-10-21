## ADDED Requirements

### Requirement: An agency can be the default host agency for new classes

The system SHALL let an Administrator designate at most one active agency as the default host agency for new classes. The default flag SHALL be settable from the standalone New agency and Edit agency forms and SHALL be hidden from staff who are not Administrators. Designating an agency as the default SHALL clear the previous default in the same transaction. Clearing the default SHALL leave the department with no default host agency. The system SHALL show an inline warning before saving when the action would replace or clear the current default. While an agency is the default, the system SHALL refuse to deactivate or archive it. The Agencies list SHALL identify the default agency.

#### Scenario: Set a default while creating an agency
- **WHEN** an Administrator creates an agency with the default checkbox selected
- **THEN** the agency is stored as the default host agency

#### Scenario: Set a default while editing an agency
- **WHEN** an Administrator edits an active agency and selects the default checkbox
- **THEN** the agency is stored as the default host agency

#### Scenario: Replace the previous default
- **WHEN** an Administrator saves a different agency as the default while another agency is already the default
- **THEN** the previous agency is no longer the default and the newly saved agency is the only default

#### Scenario: Clear the default
- **WHEN** an Administrator unchecks the checkbox on the current default agency and saves
- **THEN** no agency is the default and new classes start without a preselected host agency

#### Scenario: Warn before replacing or clearing
- **WHEN** an Administrator changes the default checkbox in a way that would replace or clear the current default
- **THEN** the form shows an inline warning naming the current default before the change is saved

#### Scenario: Block deactivation while default
- **WHEN** staff attempt to deactivate the default host agency
- **THEN** the system refuses the change and requires the default to be cleared first

#### Scenario: Block archiving while default
- **WHEN** staff attempt to archive the default host agency
- **THEN** the system refuses the change and requires the default to be cleared first

#### Scenario: Non-administrator cannot set the default
- **WHEN** a staff member who is not an Administrator submits an agency update that sets the default flag
- **THEN** the system rejects the default change and leaves the existing default unchanged

#### Scenario: Identify the default in the list
- **WHEN** staff view the Agencies list
- **THEN** the default host agency is visibly identified as the default
