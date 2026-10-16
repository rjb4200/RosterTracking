## ADDED Requirements

### Requirement: Training categories carry a kind

The system SHALL represent each training category with a kind of `fire` or `ems`. A category of kind `fire` SHALL be the Fire class category, and a category of kind `ems` SHALL be the EMS class category. The system SHALL default existing and newly authored categories without an explicit kind to `fire`.

#### Scenario: Existing codes are Fire categories
- **WHEN** the kind of a category created before this catalog existed is read
- **THEN** its kind is `fire`

#### Scenario: Author an EMS category
- **WHEN** staff create a training category and choose the EMS kind
- **THEN** the category is stored with kind `ems`

### Requirement: Training categories are listed in kind sections, ordered alphabetically

The system SHALL list the training-category catalog as a Fire section followed by an EMS section, and SHALL order the categories within each section alphabetically by their label.

#### Scenario: Fire section precedes the EMS section
- **WHEN** staff open the training-category catalog
- **THEN** the Fire categories are listed first and the EMS categories are listed after them

#### Scenario: Alphabetical within a section
- **WHEN** a section's categories are listed
- **THEN** they appear in alphabetical order by label

### Requirement: EMS categories group a core set above a separator

The system SHALL place the five core EMS categories — Airway, Cardiology, Medical, Operations, and Trauma — in a separate group that is offered above a separator, and SHALL offer the remaining EMS categories as a following group, each group ordered alphabetically.

#### Scenario: Offer the core group first
- **WHEN** the EMS categories are offered in a picker
- **THEN** the core categories are shown in a group above a separator and the remaining categories follow in their own group

#### Scenario: Order within the core group
- **WHEN** the core EMS categories are offered
- **THEN** they are ordered alphabetically

### Requirement: The EMS category catalog is seeded directly

The system SHALL ship the approved EMS category list as application-seeded reference data and SHALL insert it idempotently, so that re-running the seed repopulates a cleared catalog without overwriting staff edits to existing categories. The seeded list SHALL exclude military tactical casualty care (TCCC) courses, SHALL include `CPR - Healthcare Professional` and `Advanced Cardiac Life Support` as separate categories, and SHALL include `An Introduction to the National Incident Management System` and `IS-700.B: An Introduction to the National Incident Management System` as separate categories.

#### Scenario: Seed the EMS list
- **WHEN** the EMS category seed runs against a database with no EMS categories
- **THEN** the approved EMS categories are inserted, with the core group set apart

#### Scenario: Re-seed without overwriting edits
- **WHEN** the EMS category seed runs again after staff have edited a seeded category
- **THEN** the edited category is left unchanged and missing categories are repopulated

### Requirement: A category is offered only to pickers of its own kind

The system SHALL offer a `fire` category only to Fire category pickers and an `ems` category only to EMS category pickers. A Fire picker SHALL NOT offer any EMS category and an EMS picker SHALL NOT offer any Fire category.

#### Scenario: Fire picker excludes EMS categories
- **WHEN** staff open the Fire class category picker
- **THEN** only Fire categories are offered

#### Scenario: EMS picker excludes Fire categories
- **WHEN** staff open the EMS class category picker
- **THEN** only EMS categories are offered

### Requirement: Matching Fire and EMS categories can be mapped

The system SHALL let a Fire category and an EMS category be mapped to each other, and SHALL resolve the mapping in either direction. A category MAY have no mapped counterpart.

#### Scenario: Map a matching pair
- **WHEN** staff map a Fire category to its matching EMS category
- **THEN** selecting either category can resolve the other through the mapping

#### Scenario: A category without a counterpart
- **WHEN** a category has no mapped counterpart
- **THEN** the system resolves no mapped category for it and does not fail
