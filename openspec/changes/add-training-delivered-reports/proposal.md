## Why

Training Majors must be able to hand a student, or their agency, a KBEMS Continuing Education record: the level requirements for reference and the training actually delivered in a renewal period, so the reader can see what they have and what they still need. Today the Reports workspace can only produce the MTU Usage Summary, so this is currently done by hand in per-person KBEMS CE Tracker spreadsheets. Agencies and training sites also need a "training delivered" report for a period. All of this can be built from records the department already holds, without collecting anything new from students.

## What Changes

- Add a shared **KBEMS CE requirements reference block** — requirements by clinician level (EMR / EMT / AEMT / Paramedic), including the Pediatric requirement — rendered at the top of every training-delivered report.
- Add a **renewal-period selector** to the Reports page: calculated two-year-cycle presets (last, current, next; each ending 12/31) that prefill a start/end range, plus custom start and end dates for other time frames.
- Add a **student CE transcript** report: the requirements block plus a flat, chronological list of the training delivered to one student within the period (date, course, category, hours). Classes are classified once — a class's EMS category, otherwise "Uncategorized" for a KBEMS class with no category, otherwise "Other" for a class reported only to Fire. It downloads as a PDF, with an option to bundle each included class's completion certificate after the transcript.
- Add an **agency training-delivered** report and a **training-site training-delivered** report: the training delivered for an agency / at a site over the period.
- Add a **quick link** from the student detail page to the student transcript report, preselecting that student.
- Seed `HIV/AIDS`, `PAHT`, and `SVAT` as pinned EMS categories, since the requirements block references them and the catalog does not yet carry them.
- Reuse the existing report access rule: Administrators and Training Majors only.
- Explicitly **not** included: no new student-entered data, no scoring of "remaining"/"met", no pediatric hours captured on classes, and no grouping of the log by category.

## Capabilities

### New Capabilities
- `training-delivered-reports`: the KBEMS CE requirements reference block; the renewal-period selection (calculated presets plus a custom range); the per-report inputs the Reports workspace gains (a student, agency, or site selector); the student CE transcript and its optional completion-certificate packet; the agency and training-site training-delivered reports; their access control; and the student quick link.

### Modified Capabilities
- None. The `reports` capability has not yet been synced to `openspec/specs/` (its delta still lives in the unarchived `replace-reporting-with-reports` change), so the workspace additions this change introduces are expressed as new requirements in the new capability rather than as a delta against an unsynced base.

## Impact

- Reports module: new registry entries and builders, a shared KBEMS requirements constant, a requirements-block renderer, and a renewal-period preset helper.
- Reports page (`/staff/reports`): per-report inputs, the preset picker, and query-parameter preselection from the student quick link.
- Student detail page: a link into the Reports page.
- Reference seed: `HIV/AIDS`, `PAHT`, and `SVAT` added as pinned EMS categories.
- Reuses the existing `pdf-lib` dependency and the completion-certificates renderer for the certificate packet.
- No database schema change: everything derives from `classes` (EMS category), `attendance` (credited hours, active rows), `training_codes`, `students`, `agencies`, and `training_sites`.
