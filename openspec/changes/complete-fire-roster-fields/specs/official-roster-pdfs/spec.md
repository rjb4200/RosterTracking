## ADDED Requirements

### Requirement: KFS-1A populates every approved non-signature field
The system SHALL populate the KFS-1A subject rows with each finalized subject's Category, Class Name, Curriculum, Lesson Plan, Start, End, method indication, and Hours, up to the form's supported number of subject rows. It SHALL populate the Lead and Assisting instructor FFN and certification-level fields from the finalized revision facts.

#### Scenario: Fill subject rows
- **WHEN** a finalized revision has one or two Fire subjects
- **THEN** the generated KFS-1A shows each subject's category, class name, curriculum, lesson plan, times, method, and hours

#### Scenario: Fill instructor certification fields
- **WHEN** a finalized revision has instructor FFN and level facts
- **THEN** the generated KFS-1A shows each instructor's FFN and marks the recorded certification level

#### Scenario: Omit a missing optional value
- **WHEN** a subject has no curriculum or an instructor has no FFN
- **THEN** the generated KFS-1A leaves that field blank rather than printing a placeholder

### Requirement: KFS-1A leaves entry fields blank and audits that fact
The system SHALL leave the KFS-1A Date Entered and Entered By fields blank because the roster is generated before external reporting. The system SHALL record that these fields were left blank, and by whom the roster was generated, in the audit log.

#### Scenario: Generate a roster before reporting
- **WHEN** authorized staff generate a KFS-1A for a finalized revision that has not been reported
- **THEN** the Date Entered and Entered By fields are blank and an audit event records the generation

#### Scenario: Signature and initials stay blank
- **WHEN** the KFS-1A is generated
- **THEN** attendee initials and instructor signature fields remain blank for physical signing
