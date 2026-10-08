## MODIFIED Requirements

### Requirement: Training code catalog
The system SHALL store training codes with a code, title, and source revision.

#### Scenario: Import training codes
- **WHEN** a structured training-code list is imported
- **THEN** codes are stored idempotently keyed by code and source revision

## REMOVED Requirements

### Requirement: Course definitions
**Reason**: The Course catalog is retired; the class name and the EMS course name replace reusable course definitions.
**Migration**: Before `courses` is dropped, each class's name is set from its current course name; the Courses admin screen and the `courses.manage` permission are removed.

### Requirement: Searchable catalog administration
**Reason**: Course search retires with the catalog; training-code and training-site search are covered by their own requirements.
**Migration**: Search training codes and training sites instead of courses.

## ADDED Requirements

### Requirement: Searchable training-code catalog
The system SHALL let authorized staff search training codes by code or title during class creation.

#### Scenario: Search training codes
- **WHEN** staff search training codes by a code or title fragment while creating a class
- **THEN** matching active training codes are returned
