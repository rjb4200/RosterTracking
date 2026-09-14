## MODIFIED Requirements

### Requirement: Class records use reference data
The system SHALL let authorized staff create a draft class with a required course, one of the Classroom, Hands-On, Online, or Hybrid delivery methods, a training site when applicable, selected reporting systems, an initial scheduled session, and an assigned lead instructor. A class SHALL retain references to its selected catalog records rather than copied free-text values. Classroom, Hands-On, and Hybrid classes SHALL require a training site; Online classes SHALL permit no training site.

#### Scenario: Create a classroom draft
- **WHEN** authorized staff select a course, Classroom delivery, a training site, a scheduled session, a lead instructor, and reporting systems
- **THEN** the system creates a draft class with those selections

#### Scenario: Require a site for site-based delivery
- **WHEN** staff attempt to save a Classroom, Hands-On, or Hybrid class without a training site
- **THEN** the system rejects the draft with a site-required validation error

#### Scenario: Create an online draft without a site
- **WHEN** authorized staff select Online delivery without a training site
- **THEN** the system permits the draft to be created

#### Scenario: Migrate historical delivery values
- **WHEN** the delivery-method migration runs against existing classes
- **THEN** it converts `in_person` to `classroom`, `virtual` to `online`, and retains `hybrid` as `hybrid`

### Requirement: Class creation is a stepped staff workflow
The system SHALL provide authorized staff a visibly stepped class-creation workflow that validates each stage before advancing, preserves entered values while navigating, and creates a complete scheduled draft only at final submission.

#### Scenario: Review before creation
- **WHEN** staff finish the reporting step
- **THEN** the workflow presents a review of their selections before creating the draft

#### Scenario: Resume a draft
- **WHEN** staff leave a partially configured class draft and return later
- **THEN** the workflow restores the saved selections and components
