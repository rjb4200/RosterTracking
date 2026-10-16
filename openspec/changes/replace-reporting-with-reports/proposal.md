## Why

The current `/staff/reporting` page is a submission work queue that no one uses, and it does not give Training Majors the period summaries they actually need. In this domain "reporting" has meant pushing rosters to Fire/KBEMS/MTU; the majors need the other meaning: generating downloadable reports over a time period for grant purchase tracking.

## What Changes

- **BREAKING** Remove the `/staff/reporting` queue page, its query, and its destination-status controls. The destination-status table is retained (dormant) so it can be repurposed to track Fire exports later.
- Add a **Reports** page (`/staff/reports`) where staff pick a time frame, pick a report, and generate a downloadable file.
- Ship the first report: an **MTU Usage Summary PDF** for grant purchase tracking, covering instructor hours, student hours, site count, student count, transportation mileage (van estimate, POV, department vehicle as separate lines), location and basic student list, course list, supplies, and equipment use.
- **BREAKING** Extend MTU usage so each selected transport records its own mileage (per-vehicle mileage), replacing the single shared mileage box. This updates the class-creation MTU step and the review-page MTU editor.
- Rename the "Reporting" nav item to "Reports".
- Deferred (not in this change): the Fire export report that marks classes exported, Excel output, and all other catalog reports. Retroactive MTU-class marking is tracked in issue #67.

## Capabilities

### New Capabilities

- `reports`: the reports catalog page — time frame selection, report selection, generation, and signed-in-staff access control — as the extensible home for future reports.
- `mtu-usage-summary`: the required contents and metrics of the MTU Usage Summary PDF report.

### Modified Capabilities

- `finalization-reporting`: retire the "reporting work is queued by status" requirement and the queue surface; destination statuses stop producing staff work while their records are retained.
- `mtu-usage-tracking`: capture a mileage estimate per selected transport vehicle instead of one shared class mileage value.

## Impact

- Removes `src/app/staff/(protected)/reporting/*` and the queue read path (`listReportingQueue`, `updateReportingDestinationAction`, `ReportingDestinationControl`).
- Adds `src/app/staff/(protected)/reports/*` and a report-generation module; reuses the existing `pdf-lib` dependency.
- Schema: adds a per-transport mileage value to `class_mtu_usage_items` (or equivalent); no change to the dormant `finalization_reporting_statuses` table.
- Updates the class-creation MTU step and review MTU editor for per-vehicle mileage; updates `mtuCatalog`/transport handling in services.
- Nav label change in `src/app/staff/(protected)/layout.tsx`; reuses the Admin + Training Major report permission.
- Existing classes with a single recorded mileage need a migration/backfill decision (see design).
