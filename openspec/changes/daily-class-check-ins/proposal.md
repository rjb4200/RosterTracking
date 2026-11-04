# Proposal

## Why

Initial-certification programs meet on several non-consecutive days, but the app records only one attendance timestamp per student and rejects a later scan as “already signed in.” The Class sign-in record therefore cannot show daily attendance. Instructors need a digital daily attendance form and a clear way to handle students who miss days before issuing certificates.

## What Changes

- Add a daily check-in record for each student and class date, separate from the single attendance/enrollment record.
- Allow a student to check in again on a later date for an initial-certification program; one check-in per student per department-calendar date remains idempotent.
- Infer class days from the distinct dates that have at least one check-in; no pre-scheduled day list is required.
- Group and paginate the existing Class sign-in record by date while keeping its current entry layout.
- In the review workspace, flag active students who are missing one or more class days.
- Require a per-student disposition for every flagged student:
  - include the certificate and enter a note, or
  - exclude the certificate and enter a reason.
- Block finalization until every flagged student has a disposition.
- Keep an excluded student on the roster, transcript, and credited hours, but skip their certificate.
- Freeze daily check-ins and dispositions into the finalization revision so the finalized record cannot change later.
- Keep non-initial classes on the existing single-attendance behavior.

## Capabilities

### New Capabilities

- `daily-class-check-ins`: the daily check-in log, inferred class days, date-paginated sign-in record, missing-day flags, per-student certificate dispositions, and finalization blocking.

### Modified Capabilities

- `attendance-sign-in`: initial-certification students may check in once per class date while retaining one active attendance record.
- `class-sign-in-record`: the record presents daily check-ins grouped and paginated by date.
- `guided-roster-finalization`: missing-day flags and per-student certificate dispositions block finalization until resolved.
- `completion-certificates`: a certificate-excluded participant remains on the roster and transcript but receives no certificate.

## Impact

- New daily check-in table and certificate-disposition storage, with a migration.
- Sign-in workflow, class sign-in record PDF, review readiness/finalization, certificate queue, and finalization snapshot.
- Depends on `initial-certification-program-hours` so the class can span days.
- No change to non-initial class attendance or certificate behavior.
