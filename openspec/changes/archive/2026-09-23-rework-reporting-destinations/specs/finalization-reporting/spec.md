## MODIFIED Requirements

### Requirement: Reporting destinations are independent
The system SHALL allow only Training Majors and Administrators to manage Fire, KBEMS, and MTU reporting status independently for each finalization revision. Each destination SHALL have one of `pending`, `entered`, `needs_correction`, or `not_required` as its current status. The system SHALL retain the staff actor, server timestamp, optional external reference number, and optional notes for each status update.

#### Scenario: Record one destination entry
- **WHEN** authorized staff mark Fire entered for a revision
- **THEN** the system records Fire as entered with the authenticated staff user and server timestamp without changing KBEMS or MTU status

#### Scenario: Mark a destination not required
- **WHEN** authorized staff mark a reporting destination not required for a revision
- **THEN** the system excludes that destination from pending reporting work while retaining its status update metadata

#### Scenario: Record a correction need
- **WHEN** staff identify a reporting correction for one destination
- **THEN** that destination is marked needs-correction with retained notes while other destinations remain unchanged

#### Scenario: Preserve migrated reporting progress
- **WHEN** the reporting-status migration runs against an existing reported destination
- **THEN** the system preserves its actor, timestamp, reference number, and notes while representing its status as entered

### Requirement: Reporting work is queued by status
The system SHALL provide a Training Major reporting work queue for finalized revisions with reporting destinations that require staff action. The queue SHALL show workload counts by destination and status, support filtering by reporting destination, status, and a date range, and show each queue item's class date, course name, lead instructor, active student count, reporting destination, and current status. A queue item whose class has an earlier finalization revision SHALL be marked as revised work and SHALL identify the revision it supersedes together with that revision's status for the same destination, so a destination that was already reported cannot be mistaken for first-time work. The queue SHALL provide authorized staff a direct Mark entered action and a Mark not required action. Where an approved official roster form exists for the reporting destination, the queue SHALL provide its download action; the system SHALL not offer a PDF action for destinations without a supported form.

#### Scenario: View pending workload
- **WHEN** an authorized Training Major views the reporting queue
- **THEN** the system shows pending and needs-correction destination work with destination-specific workload counts

#### Scenario: Filter destination work
- **WHEN** staff filter the reporting queue by KBEMS, needs-correction status, and a date range
- **THEN** the system shows only KBEMS items in that status whose class dates are within the requested range

#### Scenario: Mark entered from the queue
- **WHEN** authorized staff select Mark entered for a pending destination
- **THEN** the system records entered status using the authenticated staff user and server timestamp without requiring those values as form input

#### Scenario: Identify work that supersedes an earlier revision
- **WHEN** a reopened class is finalized again and its destination work appears in the queue
- **THEN** each item identifies the earlier revision it supersedes and that revision's status for the same destination

#### Scenario: Distinguish revised work from first-time work
- **WHEN** a class is finalized for the first time
- **THEN** its queue items are not marked as superseding an earlier revision

#### Scenario: Reach the superseded revision
- **WHEN** an authorized Training Major views a queue item marked as revised work
- **THEN** the system provides a way to reach the revision it supersedes and the destination statuses recorded on it

#### Scenario: Download a supported roster from the queue
- **WHEN** staff view a Fire or KBEMS reporting queue item with a supported official roster form
- **THEN** the system provides the corresponding finalized roster PDF download from that item

#### Scenario: Exclude unsupported roster forms
- **WHEN** staff view an MTU reporting queue item
- **THEN** the system does not offer an official roster PDF download
