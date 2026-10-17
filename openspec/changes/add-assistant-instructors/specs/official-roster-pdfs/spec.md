## MODIFIED Requirements

### Requirement: Form fields preserve official-signature boundaries
The system SHALL populate the KFS-1A signing-instructor signature area from the finalization revision's signing facts and each attendee's initials cell from the attendee's name, and SHALL leave every non-signing instructor's signature area blank for the required physical signing process. It SHALL populate only approved fields otherwise.

#### Scenario: Populate the Fire signature and initials
- **WHEN** the system generates a KFS-1A roster for a signed revision
- **THEN** the signing-instructor signature area shows the electronic signature and each attendee row shows the attendee's derived initials

#### Scenario: Place the signing instructor in the lead signature area
- **WHEN** the signing instructor is the class's assistant instructor
- **THEN** the signature area of the KFS-1A lead instructor position shows that instructor's electronic signature

#### Scenario: Leave the non-signing signature blank
- **WHEN** the system generates a KFS-1A roster
- **THEN** no electronic attestation is rendered for the non-signing instructor

### Requirement: KFS-1A populates every approved non-signature field
The system SHALL populate the KFS-1A subject rows with each finalized subject's Category, Class Name, Curriculum, Lesson Plan, Start, End, method indication, and Hours, up to the form's supported number of subject rows. It SHALL populate the Lead and Assisting instructor name, FFN, and certification-level fields from the finalized revision facts, placing the signing instructor in the Lead fields and any non-signing instructor in the Assisting fields.

#### Scenario: Fill subject rows
- **WHEN** a finalized revision has one or two Fire subjects
- **THEN** the generated KFS-1A shows each subject's category, class name, curriculum, lesson plan, times, method, and hours

#### Scenario: Mark the recorded delivery method
- **WHEN** a finalized subject session recorded a method derived from its class delivery method
- **THEN** the generated KFS-1A marks the matching Method boxes, and a hybrid session marks both CR and OL

#### Scenario: Fill instructor certification fields
- **WHEN** a finalized revision has instructor FFN and level facts
- **THEN** the generated KFS-1A shows each instructor's FFN and marks the recorded certification level

#### Scenario: Place the signing assistant in the lead fields
- **WHEN** the signing instructor is the class's assistant instructor
- **THEN** the generated KFS-1A shows the assistant instructor's name, FFN, and certification level in the Lead instructor fields, and the non-signing instructor in the Assisting fields

#### Scenario: Omit a missing optional value
- **WHEN** a subject has no curriculum or an instructor has no FFN
- **THEN** the generated KFS-1A leaves that field blank rather than printing a placeholder
