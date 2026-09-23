## ADDED Requirements

### Requirement: Fire destination step collects subject rows
When Fire is a selected destination, the system SHALL provide a Fire step that collects up to two subject rows. Each subject row SHALL capture a Category from the searchable training-code catalog, a Class Name, a Curriculum from the searchable approved-curricula catalog, and a free-text Lesson Plan. Selecting a training code SHALL pre-fill the Class Name, and staff SHALL be able to overwrite the Class Name manually.

#### Scenario: Select a training code
- **WHEN** staff choose a training code on a Fire subject row
- **THEN** the system pre-fills the Class Name from the training code's title and keeps it editable

#### Scenario: Override the class name
- **WHEN** staff edit a pre-filled Class Name
- **THEN** the system keeps the typed Class Name while retaining the selected training code as the category

#### Scenario: Add a second subject
- **WHEN** staff add a second Fire subject row
- **THEN** the system collects its category, class name, curriculum, and lesson plan independently of the first

#### Scenario: Limit to two subjects
- **WHEN** two Fire subject rows already exist
- **THEN** the system does not offer a third subject row

#### Scenario: Require the subject essentials
- **WHEN** staff try to leave the Fire step with a subject row that has no category or class name
- **THEN** the system blocks the step and identifies the missing field
