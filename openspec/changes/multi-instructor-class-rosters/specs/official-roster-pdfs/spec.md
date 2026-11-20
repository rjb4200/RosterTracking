# Spec Delta

## ADDED Requirements

### Requirement: Instructor roster supplement is appended for larger teams

When a finalized revision has more than two assigned instructors, the system SHALL append an Instructor Roster Supplement page to the KFS-1A Fire roster and to the KBEMS-E16 certificate packet. The supplement SHALL be generated from the finalized revision, SHALL use the document's page size and typography, and SHALL be subject to the same access control and audit facts as the roster it accompanies.

#### Scenario: Append the supplement to a Fire roster
- **WHEN** a finalized Fire revision has a lead, an assistant, and one or more additional instructors
- **THEN** the KFS-1A output includes the roster pages, the instructor supplement, and any individual training notice pages

#### Scenario: Append the supplement to a KBEMS packet
- **WHEN** a finalized KBEMS revision with more than two instructors is included in the certificate packet
- **THEN** the supplement follows the E16 roster pages

#### Scenario: Omit the supplement for two instructors
- **WHEN** a finalized revision has one or two assigned instructors
- **THEN** the system does not generate an instructor supplement

### Requirement: Instructor roster supplement lists every instructor

The supplement SHALL list every assigned instructor's name, FFN, Fire Instructor level, and role of Lead, Assistant, or Additional. It SHALL carry no signature lines.

#### Scenario: List every instructor and role
- **WHEN** the supplement is generated
- **THEN** it lists the lead, the assistant when present, and every additional instructor with each instructor's name, FFN, level, and role

#### Scenario: Leave missing certification values blank
- **WHEN** an instructor has no FFN or no certification level
- **THEN** the supplement leaves that value blank without omitting the instructor

#### Scenario: Do not render signatures on the supplement
- **WHEN** the supplement is generated
- **THEN** it contains no electronic or blank instructor signature lines

## MODIFIED Requirements

### Requirement: Form fields preserve official-signature boundaries

The system SHALL populate the KFS-1A signature area from the revision's Fire attestation and each attendee's initials cell from the attendee's name. For a current revision, the Fire attestation is the lead's attestation. For a legacy revision, the attestation is the recorded Fire signer's. The KFS-1A SHALL be generated only when the Fire attestation exists; a new revision SHALL NOT render a blank instructor signature. A legacy revision that predates the Fire attestation SHALL keep the documented blank-signature fallback. The KFS-1A has one instructor signature line and no separate assisting-instructor signature area. The system SHALL populate only approved fields otherwise.

#### Scenario: Populate the Fire signature and initials
- **WHEN** the system generates a KFS-1A roster for a revision with a Fire attestation
- **THEN** the signature area shows the attesting instructor's electronic signature and each attendee row shows the attendee's derived initials

#### Scenario: Do not generate before the Fire signature
- **WHEN** a legacy Fire class is finalized but its Fire attestation is pending
- **THEN** the system does not generate the KFS-1A

#### Scenario: Leave the assisting signature blank
- **WHEN** the system generates a KFS-1A roster
- **THEN** no electronic attestation is rendered for the assisting instructor

#### Scenario: Keep the legacy blank signature
- **WHEN** a revision predates the Fire attestation and has no recorded signature
- **THEN** the KFS-1A keeps the documented blank-signature fallback

### Requirement: KFS-1A populates every approved non-signature field

The system SHALL populate the KFS-1A subject rows with each finalized subject's Category, Class Name, Curriculum, Lesson Plan, Start, End, recorded method set, and Hours, up to the form's supported number of subject rows. It SHALL populate the Lead instructor fields from the lead instructor and the Assisting instructor fields from the assistant instructor, using the name, FFN, and certification-level facts preserved by the revision. It SHALL leave the Assisting fields blank when no assistant exists and SHALL NOT place additional instructors in either official instructor block. For a legacy revision whose recorded Fire signer is not the lead, the system SHALL preserve the existing mapping: the recorded Fire signer fills the Lead fields and the other instructor fills the Assisting fields.

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
- **THEN** the generated KFS-1A shows the lead's and assistant's FFN and marks each recorded certification level

#### Scenario: Place the lead and assistant
- **WHEN** a finalized revision has a lead and an assistant
- **THEN** the KFS-1A shows the lead in the Lead instructor fields and the assistant in the Assisting instructor fields

#### Scenario: Place the Fire signer in the lead fields
- **WHEN** a legacy revision's recorded Fire signer is the assistant instructor
- **THEN** the generated KFS-1A shows that instructor's name, FFN, and certification level in the Lead instructor fields and the other instructor in the Assisting fields

#### Scenario: Omit a missing optional value
- **WHEN** a subject has no curriculum, an instructor has no FFN, or no assistant exists
- **THEN** the generated KFS-1A leaves that field blank rather than printing a placeholder

#### Scenario: Do not place an additional instructor on the form
- **WHEN** a finalized revision has additional instructors
- **THEN** the KFS-1A's Lead and Assisting fields contain only the lead and assistant

### Requirement: KBEMS-E16 prints the class and one-day schedule

The system SHALL populate the KBEMS-E16 Course Name, Instructor Name, Location, Date, Start Time, End Time, Total Hours, and Course Description or Objectives fields from the finalized revision. The Instructor Name field SHALL contain the lead and assistant instructor names when both exist, and SHALL contain only the lead when no assistant exists. Additional instructors SHALL appear only on the instructor supplement. The date SHALL be the class's roster day, the start time SHALL be the earliest subject start, the end time SHALL be the latest subject end, and total hours SHALL be the sum of subject credited hours.

#### Scenario: Aggregate one subject
- **WHEN** a finalized KBEMS revision has one subject scheduled from 11:00 for 1.5 hours
- **THEN** the E16 shows the roster day, 11:00, 12:30, and 1.5 total hours

#### Scenario: Aggregate sequential subjects
- **WHEN** a finalized KBEMS revision has a 1.5-hour subject starting at 11:00 followed by a 0.5-hour subject
- **THEN** the E16 shows 11:00, 13:00, and 2.0 total hours

#### Scenario: Print the instructor pair
- **WHEN** a finalized KBEMS revision has a lead and an assistant
- **THEN** the E16 Instructor Name field contains both names

#### Scenario: Print the lead only
- **WHEN** a finalized KBEMS revision has no assistant
- **THEN** the E16 Instructor Name field contains only the lead

#### Scenario: Keep additional instructors off the form
- **WHEN** a finalized KBEMS revision has additional instructors
- **THEN** the E16 Instructor Name field does not contain them

#### Scenario: Use finalized facts after a later edit
- **WHEN** the class's course details or subjects change after finalization and the packet is generated again
- **THEN** the E16 keeps the facts preserved by the finalized revision

#### Scenario: Leave a missing optional value blank
- **WHEN** the finalized revision has no course description or objectives
- **THEN** the E16 leaves that field blank rather than printing a placeholder
