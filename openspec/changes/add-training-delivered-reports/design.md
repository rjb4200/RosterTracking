## Context

Training Majors produce KBEMS Continuing Education records for students today by hand, using per-person "KBEMS CE Tracker" workbooks. Those workbooks pair a fixed requirements matrix (hours required per content category, per clinician level, plus a Pediatric requirement) with a per-person log of completed courses, so a provider can see at a glance what the student has and what is still outstanding.

The application already holds the raw material: `students`, `attendance` (with per-student `credited_hours` and soft-deletion), `classes` (with `ems_category_id` pointing at an EMS `training_codes` row and a `training_site_id`), `agencies` with student memberships, and `training_sites`. The Reports workspace (`replace-reporting-with-reports`) already generates a downloadable PDF for a selected time frame, with an extensible report catalog and a period picker (`from`/`to`). It currently ships only the MTU Usage Summary.

Two facts about the domain shape this design:

1. **The completed side cannot be reconstructed faithfully.** A class stores exactly one `ems_category_id`, but a single course can satisfy several KBEMS content areas (PHTLS counts toward Trauma and Operations), and Pediatric hours are an overlay the app never captures. Any "remaining"/"short" figure would be wrong, so the reports must not compute one.
2. **Renewal cycles are per-person.** Cycles are two years long and end on 12/31; some clinicians are on odd end-years and some on even. There is no reliable stored renewal date on every student, so reports must be generatable for any period the operator chooses.

## Goals / Non-Goals

**Goals:**
- Generate a per-student CE transcript: a fixed KBEMS requirements reference block above a flat, chronological log of the training delivered to that student in a chosen period.
- Generate agency and training-site "training delivered" reports for a period.
- Let the operator choose a period from calculated renewal presets (last, current, next) or a custom start/end range, without any stored per-student renewal date.
- Optionally bundle each included class's completion certificate after the transcript.
- Use only data already held; collect nothing new from students.

**Non-Goals:**
- No compliance scoring: no "remaining", "met/short", or percent-complete figures.
- No Pediatric hours captured on classes, and no Pediatric total in the log.
- No grouping or subtotalling of the log by category (fragile against an editable catalog).
- No per-student clinician-level field, and no new student-entered data.
- No database schema change.
- No Excel output (stays deferred).

## Decisions

### 1. The deliverable is a "training delivered" report, not a compliance calculator
Print the requirements as a static reference; print what was delivered; let the reader map one to the other. **Why:** with one `ems_category_id` per class and no Pediatric capture, computed shortfalls would be misleading. **Alternative rejected:** reproducing the workbook's `remaining = required − completed` math — it would be wrong for any multi-category or Pediatric course, and wrongness is worse than absence.

### 2. The requirements block is a fixed constant, decoupled from the editable category catalog
The matrix (categories x EMR/EMT/AEMT/Paramedic, plus Pediatric and a Total row) ships as a code constant stamped with a source revision, keyed by plain category labels — *not* by `training_codes` ids. **Why:** the EMS category catalog is admin-editable (rename, archive, add). Coupling the printed rule to it would let a catalog edit corrupt or silently change the printed requirements. The human does the mapping between the log's recorded category and the reference rows, which is the whole premise. **Alternative rejected:** a `requirement_key` enum on each EMS category to align the log with the header — extra config, a backfill for ~35 categories, and it still cannot express a multi-category course.

### 3. Period selection is calculated presets plus a custom range; no stored renewal date
A helper derives cycle presets from the rule (two-year window ending 12/31) and today's date — last, current, next — each labeled by its end year and prefilling `from = (endYear − 1)-01-01`, `to = endYear-12-31`. The operator may instead select custom start/end dates. **Why:** not every student has a renewal date, and the odd/even split means the operator knows which cohort a student is in. **Alternative rejected:** deriving the window from `student_credentials.expiration_date` — unavailable for many students and not authoritative. Days-to-period-end is computed as `period.to − today` and printed only when positive.

### 4. One flat log, one classification per row, keyed on the class
The log is a single pass over the student's active attendance for classes whose class date falls in the period; each row is classified exactly once: the class's EMS category name, otherwise "Uncategorized" (a KBEMS class with no category), otherwise "Other" (a class reported only to Fire). It is chronological, with a grand total of credited hours and no grouping. **Why:** a dual Fire + KBEMS class carries an `ems_category_id` *and* Fire training codes; a single-classification pass guarantees it appears once. **Alternatives rejected:** grouping/subtotals (breaks as categories are edited and adds edge cases) and independent Fire/KBEMS passes (double-lists dual classes).

### 5. Class date is the earliest component start
In-period filtering uses `min(class_components.starts_at)` as the class date, matching the MTU Usage Summary scope. **Why:** consistency across reports, and the class, not the sign-in, is the unit of training delivered.

### 6. Hours come from per-student credited hours
Log hours are `attendance.credited_hours` on active (non-removed) attendance of non-cancelled classes. **Why:** credited hours are per student and respect adjustments; class component hours are not attributable to a person. **Note:** Fire-only classes contribute hours to the log's total too (as "Other"); this is intended.

### 7. Agency and site reports are training delivered, not compliance
Both list the training delivered for an agency / at a site over the period (classes, courses, categories, hours, students), reusing the MTU query shape. **Why:** a "compliance" rollup would inherit the scoring problem; activity is fully derivable and is what these audiences requested.

### 8. Certificate packet is a merged PDF
The transcript and each included class's completion certificate are merged into one PDF with `pdf-lib`. Only classes that produce a certificate (finalized KBEMS classes) contribute a page. **Why:** one download is simpler for the reader. **Fallback:** if assembly proves heavy, serve a `.zip` instead; this is a serving detail, not a requirements change.

### 9. Placement: Reports page, with a link from the student page
All reports live on `/staff/reports`. The student page carries a link that deep-links to the transcript report with the student and period preselected via query parameters; there is no second form. Access reuses the existing report permission (Administrators + Training Majors).

## Risks / Trade-offs

- **Recorded EMS category is lossy** (multi-category courses, no Pediatric) → mitigated by not scoring and by a footnote on the transcript ("hours reflect the category recorded at class creation; a course may satisfy additional KBEMS content").
- **Archived categories could render blank** if label lookup filters to active rows → resolve category names from all `training_codes` rows, including archived, so historical groups keep a label.
- **Hard-deleting a category** sends classes to "Uncategorized" (FK `set null`) → acceptable; the catalog archives rather than deletes.
- **The requirements constant goes stale** when KBEMS changes the rule → it carries a source revision and is a single, obvious edit point; effective-dating it is deferred.
- **Ordering with the in-flight `reports` capability** → this change is additive and does not depend on the unsynced `reports` spec; once archived, its requirements sit alongside the workspace's.
- **Empty period** → produce the transcript with the requirements block and an empty log (zero total), not an error.
- **Large certificate packets** → merge with `pdf-lib`; zip fallback if needed.
- **Scope of the certificate packet** → certificates are the student's own class certificates, so a transcript packet does not expose other students (unlike a roster).

## Migration Plan

- Seed `HIV/AIDS`, `PAHT`, and `SVAT` as pinned EMS categories so classes can record the mandatory content areas the reference block lists. Purely additive reference data; no backfill.
- No schema migration. Deploy is additive: new report entries, the requirements constant, the preset helper, the transcript/agency/site builders, the Reports page inputs, and the student link.
- Rollback: remove the new reports from the catalog; no data cleanup required.

## Open Questions

- Should the requirements constant be version/effective-dated now, or updated in place with a bumped source revision? (Design assumes the latter.)
- Should Pediatric ever be satisfied from the log via an `is_pediatric` flag on categories, in a later change?
- Do agency and site reports also carry the requirements block, or only the student transcript does?
