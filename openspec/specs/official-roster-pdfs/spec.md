# Official Roster PDFs Specification

## Purpose

Generate the printable KFS-1A roster PDF on demand from an immutable finalization revision.

## Requirements

### Requirement: Official rosters use finalized revision facts
The system SHALL generate the KFS-1A PDF only from a finalized roster revision. The form SHALL use the class, instructor, component, participant, agency, credit, and required credential facts preserved by that revision rather than mutable current records. Operational MTU edits SHALL NOT change the roster PDF; the form SHALL retain its existing approved fields without adding MTU usage.

#### Scenario: Generate a Fire roster
- **WHEN** a Training Major or Administrator generates a KFS-1A roster for a finalized revision
- **THEN** the PDF contains the approved Fire roster fields derived from that revision

#### Scenario: Block non-finalized source data
- **WHEN** staff attempt to generate an official roster for a class without a finalized revision
- **THEN** the system rejects the request without returning a roster document

#### Scenario: Preserve roster output after an MTU edit
- **WHEN** a class's MTU usage changes after finalization and its roster is generated again
- **THEN** the roster retains the same revision-based facts and layout without rendering MTU usage

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
The system SHALL support KFS-1A (October 2023), the KFS-1B individual training notice, and the KBEMS-E16 roster as the roster embedded in the KBEMS completion-certificate packet. The KBEMS-E16 SHALL NOT be offered as a standalone official-roster choice. The system SHALL not generate FEMA roster PDFs in this capability.

#### Scenario: Exclude deferred and retired forms
- **WHEN** staff view available standalone official roster types
- **THEN** FEMA and KBEMS-E16 are not offered as standalone generation options

#### Scenario: Include the E16 in the certificate packet
- **WHEN** the system generates the completion-certificate packet for a finalized KBEMS class
- **THEN** the packet includes the KBEMS-E16 roster pages

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

The system SHALL render each KFS-1A subject row's Class Name, Curriculum, and Lesson Plan value across up to two lines within its cell when the value does not fit on one line at a legible size. For those values the system SHALL use the largest text size that fits within the cell across the available lines rather than shrinking the value onto a single line. Values that fit on one line at a legible size SHALL render unchanged. This SHALL apply only to the KFS-1A subject rows.

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
- **WHEN** the system generates a completion certificate
- **THEN** its layout and field rendering are unaffected by this behavior

### Requirement: The Fire roster appends individual training notices

The system SHALL append the Yellow KFS-1B individual training notice pages, one per qualifying participant, to the Fire roster (KFS-1A) output for view, download, and email. The appended notices SHALL follow the same access rule as the roster and SHALL be omitted when no participant qualifies.

#### Scenario: Append notices to the Fire roster
- **WHEN** a finalized Fire class has participants outside the host agency
- **THEN** viewing, downloading, or emailing the Fire roster includes the Yellow individual training notice pages after the roster pages

#### Scenario: No notices when none qualify
- **WHEN** every participant represents the host agency
- **THEN** the Fire roster output contains only the roster pages

### Requirement: KFS-1A includes only Fire-eligible participants
The Fire roster (KFS-1A) SHALL include only the revision's attendees whose Fire inclusion was resolved as eligible, meaning the attendee had a valid FFN. Attendees without a valid FFN SHALL be omitted from the roster pages and its appended individual training notices.

#### Scenario: Omit attendees without a valid FFN
- **WHEN** a finalized revision contains an attendee without a valid FFN
- **THEN** the generated KFS-1A omits that attendee from the roster pages

#### Scenario: Include every valid-FFN attendee
- **WHEN** a finalized revision contains attendees with a valid FFN
- **THEN** each of those attendees appears once on the roster pages

### Requirement: KBEMS-E16 prints the class and one-day schedule
The system SHALL populate the KBEMS-E16 Course Name, Instructor Name, Location, Date, Start Time, End Time, Total Hours, and Course Description or Objectives fields from the finalized revision. The date SHALL be the class's roster day, the start time SHALL be the earliest subject start, the end time SHALL be the latest subject end, and total hours SHALL be the sum of subject credited hours.

#### Scenario: Aggregate one subject
- **WHEN** a finalized KBEMS revision has one subject scheduled from 11:00 for 1.5 hours
- **THEN** the E16 shows the roster day, 11:00, 12:30, and 1.5 total hours

#### Scenario: Aggregate sequential subjects
- **WHEN** a finalized KBEMS revision has a 1.5-hour subject starting at 11:00 followed by a 0.5-hour subject
- **THEN** the E16 shows 11:00, 13:00, and 2.0 total hours

#### Scenario: Use finalized facts after a later edit
- **WHEN** the class's course details or subjects change after finalization and the packet is generated again
- **THEN** the E16 keeps the facts preserved by the finalized revision

#### Scenario: Leave a missing optional value blank
- **WHEN** the finalized revision has no course description or objectives
- **THEN** the E16 leaves that field blank rather than printing a placeholder

### Requirement: KBEMS-E16 prints every attendee
The system SHALL print every active attendee of the finalized KBEMS revision on the E16, one row per attendee, showing the attendee's name, KEMSIS ID, and affiliated service. A missing KEMSIS ID SHALL be left blank without omitting the attendee. The E16 SHALL paginate attendees without omission and SHALL print the page number and page count.

#### Scenario: Print all active attendees
- **WHEN** a finalized KBEMS revision has attendees from the host agency and from other agencies
- **THEN** every active attendee appears once on the E16 with that attendee's name, KEMSIS ID, and affiliated service

#### Scenario: Keep an attendee without a KEMSIS ID
- **WHEN** an active attendee has no KEMSIS ID
- **THEN** the attendee's row is printed with the KEMSIS ID field blank

#### Scenario: Paginate an overflow roster
- **WHEN** a finalized KBEMS revision has more attendees than one E16 page supports
- **THEN** the system generates all required E16 pages with each attendee represented once and prints the page number and page count

#### Scenario: Omit removed attendance
- **WHEN** a participant's attendance was removed before finalization
- **THEN** the E16 omits that participant

### Requirement: KBEMS-E16 prints electronic signatures from attestations
The system SHALL print the recorded roster signer's name on the E16 instructor signature line. It SHALL print each active attendee's name on that attendee's signature line only when the finalized revision records a confirmed sign-in attestation. A signature line SHALL remain blank when the corresponding attestation is absent.

#### Scenario: Print the instructor signature
- **WHEN** the finalized revision records a roster signature by "Xavier Quinn"
- **THEN** the E16 instructor signature line shows "Xavier Quinn"

#### Scenario: Print attendee signatures
- **WHEN** an active attendee has a confirmed sign-in attestation in the finalized revision
- **THEN** that attendee's signature line shows the attendee's name

#### Scenario: Leave an unattested attendee blank
- **WHEN** an active attendee has no confirmed sign-in attestation in the finalized revision
- **THEN** that attendee's signature line remains blank

#### Scenario: Keep a legacy signature area blank
- **WHEN** a legacy revision has no roster signature or attendee attestation
- **THEN** the corresponding E16 signature lines remain blank

#### Scenario: Keep signatures aligned across pages
- **WHEN** the E16 paginates attendees across multiple pages
- **THEN** each attendee's signature appears on the same row as that attendee
