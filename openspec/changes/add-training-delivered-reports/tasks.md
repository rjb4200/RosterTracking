## 1. Requirements reference data

- [x] 1.1 Add the KBEMS CE requirements constant: content categories by clinician level (EMR, EMT, AEMT, Paramedic), the total row, and the Pediatric requirement, stamped with a source revision
- [x] 1.2 Seed `HIV/AIDS`, `PAHT`, and `SVAT` as pinned EMS categories (kind `ems`) so classes can record those content areas
- [x] 1.3 Implement a shared renderer that draws the requirements reference block for inclusion at the top of every training-delivered PDF

## 2. Renewal-period selection

- [x] 2.1 Add a helper that derives the renewal-cycle presets (last, current, next two-year cycles ending 12/31) from the cycle rule and the current date, each with its start/end window
- [x] 2.2 Add the preset dropdown to the Reports page that prefills the custom start/end date fields, keeping custom entry available
- [x] 2.3 Validate the period as today (end on or after start) and block generation on an invalid range

## 3. Reports workspace inputs

- [x] 3.1 Extend the reports workspace so a report may require an additional input (a student, agency, or site selector) and block generation until it is chosen
- [x] 3.2 Read report, student, agency, site, and period from query parameters so the workspace can open preselected

## 4. Student CE transcript

- [x] 4.1 Implement the scoped query: the student's active (non-removed) attendance in non-cancelled classes whose class date (earliest component start) falls within the period
- [x] 4.2 Classify each included class exactly once: its EMS category name, otherwise "Uncategorized" (KBEMS class with no category), otherwise "Other" (Fire-only)
- [x] 4.3 Resolve category labels from all `training_codes` rows, including archived, so historical rows never render blank
- [x] 4.4 Build the flat chronological log model with date, course, category, credited hours, and a grand total; ensure a dual Fire + KBEMS class yields one row
- [x] 4.5 Render the transcript PDF (requirements block + log) with `pdf-lib`, and handle an empty period with a zero total instead of failing

## 5. Transcript certificate packet

- [x] 5.1 Assemble the transcript followed by each included class's completion certificate into one PDF, skipping classes without a certificate
- [x] 5.2 Expose both downloads (transcript; transcript with certificates)
- [x] 5.3 If assembly proves heavy, fall back to serving a `.zip` (design fallback)

## 6. Agency and site training-delivered reports

- [x] 6.1 Implement the agency report: query the classes training was delivered for the agency in the period, and render the PDF (classes, courses, categories, hours, students)
- [x] 6.2 Implement the training-site report: query the classes held at the site in the period, and render the PDF (classes, courses, categories, hours, students)

## 7. Placement and access

- [x] 7.1 Register the student transcript, agency, and site reports in the report catalog, gated to Administrators and Training Majors via the existing report permission
- [x] 7.2 Add the CE transcript quick link on the student detail page that opens the transcript report with the student preselected

## 8. Verification

- [x] 8.1 Unit-test the renewal-period presets (windows, advancing by year) and invalid-range handling
- [x] 8.2 Unit-test transcript classification (category / Uncategorized / Other), the dual-class single-row rule, and the credited-hours total
- [x] 8.3 Unit-test agency and site scoping (in-period and correct agency/site only)
- [x] 8.4 Add end-to-end coverage: generate and download the student transcript, and the transcript with certificates
- [x] 8.5 Run lint, typecheck, and the test suite

## 9. Refinements

- [x] 9.1 Order the transcript and activity logs by category (then by date)
- [x] 9.2 Make the requirements reference block compact and label it as reference hours
- [x] 9.3 Put the report selector first and reveal only the inputs (and period controls) the selected report needs
- [x] 9.4 Count Pediatric as a content category above the total
- [x] 9.5 Label the requirements block as REFERENCE ONLY more prominently
- [x] 9.6 List Pediatric directly under Operations
- [x] 9.7 Give the requirements block a solid REFERENCE ONLY banner and a warning-colored note
