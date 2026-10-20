## MODIFIED Requirements

### Requirement: Form fields preserve official-signature boundaries

The system SHALL populate the KFS-1A Fire-signer signature area from the revision's Fire attestation and each attendee's initials cell from the attendee's name. The KFS-1A SHALL be generated only when the Fire attestation exists; a new revision SHALL NOT render a blank instructor signature. A legacy revision that predates the Fire attestation SHALL keep the documented blank-signature fallback. The KFS-1A has one instructor signature line and no separate assisting-instructor signature area. The system SHALL populate only approved fields otherwise.

#### Scenario: Populate the Fire signature and initials
- **WHEN** the system generates a KFS-1A roster for a revision with a Fire attestation
- **THEN** the Fire-signer signature area shows the electronic signature and each attendee row shows the attendee's derived initials

#### Scenario: Do not generate before the Fire signature
- **WHEN** a Fire class is finalized but its Fire attestation is pending
- **THEN** the system does not generate the KFS-1A

#### Scenario: Leave the assisting signature blank
- **WHEN** the system generates a KFS-1A roster
- **THEN** no electronic attestation is rendered for the non-signing instructor

#### Scenario: Keep the legacy blank signature
- **WHEN** a revision predates the Fire attestation and has no recorded signature
- **THEN** the KFS-1A keeps the documented blank-signature fallback

### Requirement: KFS-1A populates every approved non-signature field

The system SHALL populate the KFS-1A subject rows with each finalized subject's Category, Class Name, Curriculum, Lesson Plan, Start, End, method indication, and Hours, up to the form's supported number of subject rows. It SHALL populate the Lead and Assisting instructor name, FFN, and certification-level fields from the finalized revision facts, placing the Fire signer in the Lead fields and any non-signing assigned instructor in the Assisting fields.

#### Scenario: Fill subject rows
- **WHEN** a finalized revision has one or two Fire subjects
- **THEN** the generated KFS-1A shows each subject's category, class name, curriculum, lesson plan, times, method, and hours

#### Scenario: Mark the recorded delivery method
- **WHEN** a finalized subject session recorded a method derived from its class delivery method
- **THEN** the generated KFS-1A marks the matching Method boxes, and a hybrid session marks both CR and OL

#### Scenario: Fill instructor certification fields
- **WHEN** a finalized revision has instructor FFN and level facts
- **THEN** the generated KFS-1A shows each instructor's FFN and marks the recorded certification level

#### Scenario: Place the Fire signer in the lead fields
- **WHEN** the Fire signer is the class's assistant instructor
- **THEN** the generated KFS-1A shows the assistant's name, FFN, and certification level in the Lead instructor fields, and the non-signing instructor in the Assisting fields

#### Scenario: Omit a missing optional value
- **WHEN** a subject has no curriculum or an instructor has no FFN
- **THEN** the generated KFS-1A leaves that field blank rather than printing a placeholder
