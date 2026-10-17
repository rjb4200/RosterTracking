# Training Categories Specification

## Purpose
Define training categories as kinded reference records — Fire and EMS — that label class subjects, carry an optional pin and a cross-kind mapping, and stay separated so each kind is offered only to its own pickers.

## Requirements
### Requirement: Training categories carry a kind

The system SHALL represent each training category with a kind of `fire` or `ems`. A category of kind `fire` SHALL be the Fire class category, and a category of kind `ems` SHALL be the EMS class category. The system SHALL default existing and newly authored categories without an explicit kind to `fire`.

#### Scenario: Existing codes are Fire categories
- **WHEN** the kind of a category created before this catalog existed is read
- **THEN** its kind is `fire`

#### Scenario: Author an EMS category
- **WHEN** staff create a training category and choose the EMS kind
- **THEN** the category is stored with kind `ems`

### Requirement: Training categories are listed in kind sections, pinned first

The system SHALL list the training-category catalog as a Fire section followed by an EMS section, and SHALL order the categories within each section with pinned categories first and the remainder alphabetically by label. The list SHALL NOT draw a separator.

#### Scenario: Fire section precedes the EMS section
- **WHEN** staff open the training-category catalog
- **THEN** the Fire categories are listed first and the EMS categories are listed after them

#### Scenario: Pinned categories lead their section
- **WHEN** a section's categories are listed
- **THEN** the pinned categories appear first and the remainder follow in alphabetical order by label

#### Scenario: No separator in the list
- **WHEN** the training-category catalog is listed
- **THEN** the list shows no separator row between the pinned and unpinned categories

### Requirement: Staff can pin a category to sit above a separator

The system SHALL let staff mark any training category of either kind as pinned from its record form, and SHALL offer pinned categories above a separator in the class pickers.

#### Scenario: Pin a category
- **WHEN** staff mark a training category as pinned
- **THEN** the category is offered above a separator in its picker and is listed first in its section

#### Scenario: Unpin a category
- **WHEN** staff clear a training category's pinned mark
- **THEN** the category is offered within the ordinary group

#### Scenario: Pinning applies to Fire categories too
- **WHEN** staff pin a Fire category
- **THEN** it is offered above the separator in the Fire picker

### Requirement: The EMS category catalog is seeded directly

The system SHALL ship the approved EMS category list as application-seeded reference data and SHALL insert it idempotently, so that re-running the seed repopulates a cleared catalog without overwriting staff edits to existing categories. The seeded list SHALL mark the five core categories — Airway, Cardiology, Medical, Operations, and Trauma — as pinned. The seeded list SHALL exclude military tactical casualty care (TCCC) courses, SHALL include `CPR - Healthcare Professional` and `Advanced Cardiac Life Support` as separate categories, and SHALL include `An Introduction to the National Incident Management System` and `IS-700.B: An Introduction to the National Incident Management System` as separate categories.

#### Scenario: Seed the EMS list
- **WHEN** the EMS category seed runs against a database with no EMS categories
- **THEN** the approved EMS categories are inserted, with the core categories pinned

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

The system SHALL let a Fire category and an EMS category be mapped to each other from the category record form, and SHALL resolve the mapping in either direction. A category SHALL have at most one mapped counterpart, and a category MAY have none. Setting a mapping SHALL clear the previous counterpart's mapping, and clearing a mapping SHALL remove it from both categories.

#### Scenario: Map a matching pair
- **WHEN** staff set a category's mapping to a category of the other kind and save
- **THEN** both categories reference each other and selecting either resolves the other

#### Scenario: Re-map a category
- **WHEN** staff change a category's mapping to a different counterpart
- **THEN** the previous counterpart's mapping is cleared and the new pair references each other

#### Scenario: Clear a mapping
- **WHEN** staff set a category's mapping to none
- **THEN** neither the category nor its former counterpart references the other

#### Scenario: A category without a counterpart
- **WHEN** a category has no mapped counterpart
- **THEN** the system resolves no mapped category for it and does not fail
