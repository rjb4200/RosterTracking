## ADDED Requirements

### Requirement: Class sessions retain Fire subject fields
The system SHALL let a class session store a Fire subject: a training-code reference (category), a class name, a curriculum reference, and a free-text lesson plan. A class SHALL support up to two Fire subjects for official Fire output. These fields SHALL be editable while the class is open or completed and SHALL be preserved at finalization.

#### Scenario: Save a Fire subject
- **WHEN** staff save a class session with a category, class name, curriculum, and lesson plan
- **THEN** the system stores those values on the session

#### Scenario: Backfill a migrated session
- **WHEN** the migration runs against an existing session
- **THEN** its class name is set from the class course name and its category from the course's training code where available, with curriculum and lesson plan left empty

#### Scenario: Preserve Fire subjects at finalization
- **WHEN** a class with Fire subjects is finalized
- **THEN** the revision retains each subject's category, class name, curriculum, and lesson plan

### Requirement: Instructor certification details accompany the roster
The system SHALL retain each assigned instructor's Fire Commission FFN and certification level as finalization facts so official Fire output can print them, without altering the instructor's current profile.

#### Scenario: Capture instructor certification facts
- **WHEN** a class is finalized
- **THEN** the revision retains each assigned instructor's name, FFN, and certification level as they were at finalization

#### Scenario: Later profile change does not rewrite history
- **WHEN** an instructor's FFN or level changes after finalization
- **THEN** the existing revision keeps the values captured at finalization
