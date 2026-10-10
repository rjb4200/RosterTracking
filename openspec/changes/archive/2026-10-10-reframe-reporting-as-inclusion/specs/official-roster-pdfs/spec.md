## ADDED Requirements

### Requirement: KFS-1A includes only Fire-eligible participants
The Fire roster (KFS-1A) SHALL include only the revision's attendees whose Fire inclusion was resolved as eligible, meaning the attendee had a valid FFN. Attendees without a valid FFN SHALL be omitted from the roster pages and its appended individual training notices.

#### Scenario: Omit attendees without a valid FFN
- **WHEN** a finalized revision contains an attendee without a valid FFN
- **THEN** the generated KFS-1A omits that attendee from the roster pages

#### Scenario: Include every valid-FFN attendee
- **WHEN** a finalized revision contains attendees with a valid FFN
- **THEN** each of those attendees appears once on the roster pages
