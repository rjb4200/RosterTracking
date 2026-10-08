# Official Roster PDFs Specification

## Purpose

Generate printable KFS-1A and KBEMS-E16 roster PDFs on demand from immutable finalization revisions.
## Requirements
### Requirement: Official rosters use finalized revision facts
The system SHALL generate KFS-1A and KBEMS-E16 PDFs only from a finalized roster revision. Each form SHALL use the class, instructor, component, participant, agency, credit, and required credential facts preserved by that revision rather than mutable current records.

#### Scenario: Generate a Fire roster
- **WHEN** a Training Major or Administrator generates a KFS-1A roster for a finalized revision
- **THEN** the PDF contains the approved Fire roster fields derived from that revision

#### Scenario: Generate a KBEMS roster
- **WHEN** a Training Major or Administrator generates a KBEMS-E16 roster for a finalized revision
- **THEN** the PDF contains the approved KBEMS roster fields derived from that revision

#### Scenario: Block non-finalized source data
- **WHEN** staff attempt to generate an official roster for a class without a finalized revision
- **THEN** the system rejects the request without returning a roster document

### Requirement: Form fields preserve official-signature boundaries
The system SHALL populate the KFS-1A lead-instructor signature area and each attendee's initials cell from the finalization revision's signing facts, and SHALL leave the KFS-1A assisting-instructor signature, the KBEMS-E16 student and instructor signature fields, and all other signature fields blank for the required physical signing process. It SHALL populate only approved fields otherwise.

#### Scenario: Populate the Fire signature and initials
- **WHEN** the system generates a KFS-1A roster for a signed revision
- **THEN** the lead-instructor signature area shows the electronic signature and each attendee row shows the attendee's derived initials

#### Scenario: Leave the other signature fields blank
- **WHEN** the system generates a KFS-1A or KBEMS-E16 roster
- **THEN** no electronic attestation is rendered for the assisting instructor, KBEMS students, or KBEMS instructors

### Requirement: Multi-page rosters retain form context
The system SHALL paginate attendees without omitting any finalized attendee and SHALL repeat the form context and page count required for each generated form.

#### Scenario: Generate an overflow roster
- **WHEN** a finalized revision contains more attendees than one form page supports
- **THEN** the system generates all required pages with each attendee represented once

### Requirement: Official rosters are generated on demand
The system SHALL generate each official roster PDF from the selected finalized revision and return it directly to the authorized requester. The system SHALL not retain generated PDF bytes, object-storage records, or artifact metadata after the request completes.

#### Scenario: Download an on-demand roster
- **WHEN** authorized staff request an official roster for a finalized revision
- **THEN** the system returns a newly generated PDF derived from that revision

#### Scenario: Regenerate a roster
- **WHEN** authorized staff request the same official roster again
- **THEN** the system generates another PDF from the same preserved revision without retaining either generated copy

### Requirement: Official roster access is controlled

The system SHALL allow Training Majors and Administrators to generate, view, and email official rosters for any finalized revision. The system SHALL allow an instructor to perform those actions only for a revision belonging to a class to which the instructor is assigned. Viewing SHALL present the rendered PDF inline, from which the user may print or download it through the browser; the system SHALL not offer separate print and download actions.

#### Scenario: Permit an assigned instructor
- **WHEN** an instructor requests an official roster for a finalized class to which they are assigned
- **THEN** the system permits the requested roster action

#### Scenario: Prevent unrelated instructor access
- **WHEN** an instructor requests an official roster for a finalized class to which they are not assigned
- **THEN** the system denies access without disclosing generated roster content

#### Scenario: View, print, and download through one action
- **WHEN** authorized staff choose View for a form
- **THEN** the system presents the same rendered PDF inline and the browser provides the print and download workflow

### Requirement: All roster delivery methods use one rendered document
The system SHALL render a selected form from the same finalization revision and approved template for view, print, download, and email. The rendered form content and layout SHALL be identical across delivery methods for the same revision, form type, and template version.

#### Scenario: View and print an official roster
- **WHEN** authorized staff choose view or print for a form
- **THEN** the system presents the same rendered PDF inline and allows the browser print workflow

#### Scenario: Email an official roster
- **WHEN** authorized staff enter a valid recipient address for a form
- **THEN** the system sends the same rendered PDF as an attachment from `noreply@winchesterfireems.com` without storing its bytes in the application

### Requirement: Official roster email deliveries are audited
The system SHALL record the actor, finalization revision, form type, plaintext recipient email address, sender address, and server timestamp for each successful official-roster email delivery. The audit record SHALL not include PDF bytes or protected roster values.

#### Scenario: Record email delivery
- **WHEN** Resend accepts an authorized roster email for delivery
- **THEN** the system writes the required email-delivery audit record

### Requirement: Initial official-form scope is limited
The system SHALL support KFS-1A (October 2023) and KBEMS-E16 (September 2012) only. The system SHALL not generate KFS-1B individual Training Notices or FEMA roster PDFs in this capability.

#### Scenario: Exclude deferred forms
- **WHEN** staff view available official roster types
- **THEN** KFS-1B and FEMA are not offered as generation options

### Requirement: KFS-1A populates every approved non-signature field
The system SHALL populate the KFS-1A subject rows with each finalized subject's Category, Class Name, Curriculum, Lesson Plan, Start, End, method indication, and Hours, up to the form's supported number of subject rows. It SHALL populate the Lead and Assisting instructor FFN and certification-level fields from the finalized revision facts.

#### Scenario: Fill subject rows
- **WHEN** a finalized revision has one or two Fire subjects
- **THEN** the generated KFS-1A shows each subject's category, class name, curriculum, lesson plan, times, method, and hours

#### Scenario: Mark the recorded delivery method
- **WHEN** a finalized subject session recorded a method derived from its class delivery method
- **THEN** the generated KFS-1A marks the matching Method boxes, and a hybrid session marks both CR and OL

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

### Requirement: KFS-1A prints the subject chapter with the curriculum

The system SHALL print each finalized subject's curriculum in the KFS-1A Curriculum cell followed by the subject's chapter, joined as `<curriculum> - <chapter>`, where the curriculum is the catalog label or the typed book name and the chapter is the same label offered in the chapter selector, including its section when the chapter belongs to one. When a subject has no chapter, the system SHALL print only the curriculum label.

#### Scenario: Print a known book chapter
- **WHEN** a finalized subject has an approved curriculum and a chapter
- **THEN** the Curriculum cell shows the catalog curriculum label followed by " - " and the chapter, including its section when the chapter belongs to one

#### Scenario: Print a typed book
- **WHEN** a finalized subject has a typed book name
- **THEN** the Curriculum cell shows the typed book name followed by " - " and the chapter

#### Scenario: Omit an absent chapter
- **WHEN** a finalized subject has no chapter
- **THEN** the Curriculum cell shows only the curriculum label

#### Scenario: Omit an absent curriculum
- **WHEN** a finalized subject has neither an approved curriculum nor a typed book
- **THEN** the Curriculum cell is left blank rather than printing a placeholder

### Requirement: KFS-1A subject cells wrap long values

The system SHALL render each KFS-1A subject row's Class Name, Curriculum, and Lesson Plan value across up to two lines within its cell when the value does not fit on one line at a legible size. For those values the system SHALL use the largest text size that fits within the cell across the available lines rather than shrinking the value onto a single line. Values that fit on one line at a legible size SHALL render unchanged. This SHALL apply only to the KFS-1A subject rows; the KBEMS-E16 roster and all other fields SHALL be unaffected.

#### Scenario: Wrap a long curriculum label
- **WHEN** a finalized subject's Curriculum value is longer than one line at a legible size
- **THEN** the generated KFS-1A renders the value across up to two lines within the Curriculum cell at a larger size than a single auto-shrunk line would use

#### Scenario: Wrap a long class name or lesson plan
- **WHEN** a finalized subject's Class Name or Lesson Plan value is longer than one line at a legible size
- **THEN** the generated KFS-1A renders that value across up to two lines within its cell

#### Scenario: Keep a short value on one line
- **WHEN** a finalized subject's Class Name, Curriculum, or Lesson Plan value fits on one line at a legible size
- **THEN** the generated KFS-1A renders it on a single line as before

#### Scenario: Leave other documents unchanged
- **WHEN** the system generates a KBEMS-E16 roster or a completion certificate
- **THEN** its layout and field rendering are unchanged by this behavior

