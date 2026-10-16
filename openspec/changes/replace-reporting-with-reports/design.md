## Context

`/staff/reporting` today is a Training Major submission queue over finalized revisions (`listReportingQueue`). Nothing on it is used in production. Training Majors instead need period summaries for grant purchase tracking, generated on demand and downloaded.

Two constraints shape the design:

- `mtuUsage.mileage` is a single free-text value on a class, shown when a mileage-requiring transport is selected. Issue #64 wants van (estimated), POV, and department-vehicle miles as separate lines, so per-vehicle mileage must be captured first.
- Most of the wanted numbers already exist in live tables (`classes`, `classComponents`, `attendance`, `trainingSites`, `class_mtu_usage_items`). Only the transportation split is missing.

## Goals / Non-Goals

**Goals:**
- Replace the reporting queue with a Reports page that picks a time frame and a report and downloads a file.
- Make the report catalog extensible so future reports are added without reworking the page.
- Ship the MTU Usage Summary PDF covering instructor hours, student hours, site count, student count, transportation mileage lines, location/student list, course list, supplies, and equipment use.
- Capture mileage per selected transport vehicle.

**Non-Goals:**
- The Fire export report and its "mark exported" side effect (later; the dormant `finalization_reporting_statuses` table is retained for it).
- Excel output and any library for it (PDF only for now).
- Retroactive marking/removal of a class's MTU designation (issue #67).
- Reporting over frozen finalization revisions; this reads live tables.

## Decisions

### Decision: Per-vehicle mileage on the usage row

Add a numeric `mileage` to transport rows in `class_mtu_usage_items`. Each selected vehicle carries its own miles; the report groups transport rows by their catalog item, and the three issue lines fall out of the three seeded transport entries (Ford Transit van, Department vehicle, POV). A new vehicle is a catalog entry, not a code change.

- **Alternative considered:** three fixed `mtuUsage` fields (`vanMileage`, `povMileage`, `deptVehicleMileage`). Rejected — hard-codes the vehicles and fights the catalog-driven direction.
- Interaction: the existing "van requires mileage at creation" rule generalizes to "each selected mileage-requiring transport requires its own estimate." The van's existing single value backfills to the van row.

### Decision: A report registry, not a bespoke page

The Reports page renders a fixed set of registered reports (id, label, description, builder). Selecting a report and a time frame calls its builder and streams the file back as a download. Adding a report means adding a registry entry and a builder module, matching "each report will be built separately."

### Decision: Reports read live tables, scoped to MTU classes with attendance

A class is in scope when it has the MTU reporting system selected (`class_reporting_systems`), has at least one active attendance (`removedAt IS NULL`), is not `cancelled`, and its class date (`MIN(classComponents.startsAt)`) falls in the requested range. The classes' state (draft/open/finalized) does not matter.

- **Alternative considered:** reading `finalizationRevisions`/`finalizationReportingStatuses`. Rejected — the frozen revision summary lacks supplies, equipment, sites, and hours, and the scope must include open/draft classes.

### Decision: Hours and counts are defined explicitly

- `class_hours` = `SUM(classComponents.creditedHours)` for the class.
- Instructor hours = `SUM(class_hours × instructor_count)` (person-hours).
- Student hours = `SUM(class_hours × student_count)`.
- Students = `SUM(active attendance rows)` (a person in two classes counts twice).
- Sites = `COUNT(DISTINCT trainingSiteId)`.

### Decision: Reuse the existing permission and PDF stack

Reports require the existing Reporting permission held by Administrators and Training Majors; only the nav label changes ("Reporting" → "Reports"). PDF is produced with the already-present `pdf-lib`.

### Decision: Remove the queue surface, keep the destination table

Delete the reporting page, its action, its control component, and `listReportingQueue`. Finalization keeps writing destination-status rows (dormant) so the later Fire export can repurpose them.

## Risks / Trade-offs

- **Legacy mileage is free text** → the numeric backfill may not parse (e.g. "~120", "120 miles"). Mitigation: parse best-effort to the mileage-requiring vehicle; preserve the untouched legacy string in the off-catalog free-text field; flag unparseable values for review.
- **Live data drifts after finalization** → grant totals can change if a class is edited later. Mitigation: acceptable for operational grant tracking; noted as a deliberate trade-off against frozen revisions.
- **MTU classes with no sign-ins drop out of the report** → partially set-up MTU classes will not appear. Mitigation: intended by the "has students" scope; revisit with issue #67 if majors need pre-sign-in MTU classes.
- **`class_hours` sums credited component hours** → overlapping multi-component classes could over-count. Mitigation: matches the "credited class hours" intent; revisited if majors report disagreement.

## Migration Plan

1. Add nullable numeric `mileage` to `class_mtu_usage_items`; backfill each class's legacy `mtuUsage.mileage` to its mileage-requiring transport row when parseable.
2. Deploy per-vehicle mileage capture in the class-creation MTU step and the review MTU editor.
3. Deploy the Reports page and MTU Usage Summary; remove the queue surface and nav label change in the same release.
4. Rollback: the Reports page is additive except for the removed queue surface; the mileage column is nullable, so reverting the UI leaves data intact.

## Open Questions

- Exact PDF layout and section ordering (majors will refine against a first draft).
- Whether the student list is grouped strictly by site or also by course.
- Confirm `class_hours` = sum of credited component hours for the majors' definition.
