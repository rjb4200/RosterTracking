## ADDED Requirements

### Requirement: The training-category catalog is sectioned by kind

The system SHALL present the training-category catalog as two sections — Fire first, followed by EMS — and SHALL label the screen and its navigation entry "Training categories".

#### Scenario: Two sections on the catalog screen
- **WHEN** staff open the training-category catalog
- **THEN** the screen shows a Fire section followed by an EMS section

#### Scenario: Screen is labelled Training categories
- **WHEN** authorized staff reach the catalog from staff navigation
- **THEN** the screen and its navigation entry read "Training categories"

### Requirement: A training-category record selects its kind

The system SHALL present a Fire/EMS kind selector on the training-category new-record and record forms, and SHALL store the chosen kind on the record. The system SHALL let staff add, edit, deactivate, reactivate, and archive training categories of either kind through the same screens.

#### Scenario: Choose a kind when creating
- **WHEN** staff create a training category and choose a kind
- **THEN** the created record carries that kind and lists under its section

#### Scenario: Maintain an EMS category
- **WHEN** staff edit, deactivate, reactivate, or archive an EMS category from its record page
- **THEN** the record's details or state change as they would for a Fire code

### Requirement: A training-category record sets its pin and mapping

The system SHALL present, on the training-category new-record and record forms, a control to mark the category as pinned and a control to map the category to a category of the other kind. The mapping control SHALL offer only categories of the other kind, and SHALL NOT offer the record itself.

#### Scenario: Pin from the record form
- **WHEN** staff mark a training category as pinned and save
- **THEN** the record is stored as pinned

#### Scenario: Map from the record form
- **WHEN** staff choose a category of the other kind in the mapping control and save
- **THEN** the record and the chosen category are mapped to each other

#### Scenario: Mapping offers only the other kind
- **WHEN** the kind is Fire
- **THEN** the mapping control offers only EMS categories (and only Fire categories when the kind is EMS)

