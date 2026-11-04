## ADDED Requirements

### Requirement: Daily check-in log

The system SHALL record one check-in per active initial-certification attendance per department-calendar date. The first scan SHALL create the attendance; a scan on a later date SHALL add a check-in; a scan on an existing date SHALL return the existing check-in without creating a duplicate.

#### Scenario: First scan enrolls and checks in

- **WHEN** a student scans for the first time in an initial-certification program class
- **THEN** the system creates the active attendance and the first daily check-in

#### Scenario: Check in on a later date

- **WHEN** the same student scans on a later class date
- **THEN** the system adds a new check-in and does not create a second attendance

#### Scenario: Repeat a same-day scan

- **WHEN** the student scans again on a date that already has their check-in
- **THEN** the system returns the existing check-in and creates no duplicate

### Requirement: Inferred class days and date-paginated record

The system SHALL treat the distinct dates with at least one active check-in as the class days. The Class sign-in record SHALL group check-ins by date, retain the existing entry layout within each date, and paginate a date's entries when they do not fit on one page.

#### Scenario: Infer the class days

- **WHEN** students check in on three non-consecutive dates
- **THEN** the class has exactly those three class days

#### Scenario: Paginate a large date

- **WHEN** a date has more check-ins than fit on one page
- **THEN** the record continues that date on another page without losing any entries

### Requirement: Missing-day dispositions block finalization

The system SHALL flag each active student missing one or more class days and SHALL block finalization until every flagged student has either a certificate-inclusion note or a certificate-exclusion reason. An excluded student SHALL remain on the roster and transcript with credited hours but SHALL NOT receive a certificate.

#### Scenario: Block finalization for an unresolved student

- **WHEN** a flagged student has no disposition
- **THEN** finalization is blocked and the student is identified

#### Scenario: Include a flagged student with a note

- **WHEN** the operator chooses Include certificate and enters a note
- **THEN** the student remains eligible for a certificate

#### Scenario: Exclude a flagged student with a reason

- **WHEN** the operator chooses Exclude certificate and enters a reason
- **THEN** the student remains on the roster and transcript but is skipped by the certificate queue

### Requirement: Freeze daily check-ins and dispositions

The finalization revision SHALL store the daily check-ins and each certificate disposition, note or reason, and resolving actor and timestamp. The finalized Class sign-in record SHALL be built from that snapshot.

#### Scenario: Preserve the finalized evidence

- **WHEN** an initial-certification class is finalized
- **THEN** its daily check-ins and dispositions are preserved in the revision

#### Scenario: Prevent later changes from altering the finalized record

- **WHEN** the live check-in or disposition data changes after finalization
- **THEN** the finalized Class sign-in record does not change
