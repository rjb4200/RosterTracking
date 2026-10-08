## MODIFIED Requirements

### Requirement: Form fields preserve official-signature boundaries

The system SHALL populate the KFS-1A lead-instructor signature area and each attendee's initials cell from the finalization revision's signing facts, and SHALL leave the KFS-1A assisting-instructor signature, the KBEMS-E16 student and instructor signature fields, and all other signature fields blank for the required physical signing process. It SHALL populate only approved fields otherwise.

#### Scenario: Populate the Fire signature and initials
- **WHEN** the system generates a KFS-1A roster for a signed revision
- **THEN** the lead-instructor signature area shows the electronic signature and each attendee row shows the attendee's derived initials

#### Scenario: Leave the other signature fields blank
- **WHEN** the system generates a KFS-1A or KBEMS-E16 roster
- **THEN** no electronic attestation is rendered for the assisting instructor, KBEMS students, or KBEMS instructors

### Requirement: KFS-1A leaves entry fields blank and audits that fact

The system SHALL leave the KFS-1A Date Entered and Entered By fields blank because the roster is generated before external reporting. The system SHALL record that these fields were left blank, and by whom the roster was generated, in the audit log.

#### Scenario: Generate a roster before reporting
- **WHEN** authorized staff generate a KFS-1A for a finalized revision that has not been reported
- **THEN** the Date Entered and Entered By fields are blank and an audit event records the generation
