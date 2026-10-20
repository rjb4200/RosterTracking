## MODIFIED Requirements

### Requirement: KFS-1A populates every approved non-signature field
The system SHALL populate the KFS-1A subject rows with each finalized subject's Category, Class Name, Curriculum, Lesson Plan, Start, End, recorded method set, and Hours, up to the form's supported number of subject rows. It SHALL populate the Lead and Assisting instructor name, FFN, and certification-level fields from the finalized revision facts, placing the Fire signer in the Lead fields and any non-signing assigned instructor in the Assisting fields.

#### Scenario: Fill subject rows
- **WHEN** a finalized revision has one or two Fire subjects
- **THEN** the generated KFS-1A shows each subject's category, class name, curriculum, lesson plan, times, method, and hours

#### Scenario: Mark the recorded method set
- **WHEN** a finalized subject session recorded one or more methods
- **THEN** the generated KFS-1A marks every matching Method box

#### Scenario: Mark the recorded delivery method
- **WHEN** a finalized subject session recorded a method derived from its class delivery method
- **THEN** the generated KFS-1A marks the matching Method boxes, and a hybrid session marks both CR and OL

#### Scenario: Mark multiple methods
- **WHEN** a finalized subject session recorded CR and HO
- **THEN** the generated KFS-1A marks both the CR and HO Method boxes

#### Scenario: Fill instructor certification fields
- **WHEN** a finalized revision has instructor FFN and level facts
- **THEN** the generated KFS-1A shows each instructor's FFN and marks the recorded certification level

#### Scenario: Place the Fire signer in the lead fields
- **WHEN** the Fire signer is the class's assistant instructor
- **THEN** the generated KFS-1A shows the assistant's name, FFN, and certification level in the Lead instructor fields, and the non-signing instructor in the Assisting fields

#### Scenario: Omit a missing optional value
- **WHEN** a subject has no curriculum or an instructor has no FFN
- **THEN** the generated KFS-1A leaves that field blank rather than printing a placeholder
