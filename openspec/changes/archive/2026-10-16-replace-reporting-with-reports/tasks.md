## 1. Per-vehicle mileage data model

- [x] 1.1 Add a nullable numeric `mileage` to `class_mtu_usage_items` (transport rows) and generate the migration
- [x] 1.2 Backfill each existing class's single `mtuUsage.mileage` to its mileage-requiring transport row when the value parses as a number
- [x] 1.3 Preserve unparseable legacy mileage text in the off-catalog free-text field so nothing is lost
- [x] 1.4 Update the MTU usage read/write services and types to carry per-transport mileage

## 2. MTU usage capture in the UI

- [x] 2.1 Update the class-creation MTU step to show a mileage input per selected mileage-requiring transport
- [x] 2.2 Update wizard validation so advancing requires an estimate for every selected mileage-requiring transport
- [x] 2.3 Update the review-page MTU editor to edit each vehicle's mileage independently
- [x] 2.4 Verify the mileage requirement lapses on deselect and is not enforced after creation, on edit, or at finalization

## 3. Reports workspace

- [x] 3.1 Add a report registry (id, label, description, builder)
- [x] 3.2 Create `/staff/reports` with a time-frame picker and a report picker
- [x] 3.3 Wire generation to return the built file as a download; block generation when the time frame or report is missing
- [x] 3.4 Gate access to Administrators and Training Majors using the existing report permission
- [x] 3.5 Change the staff navigation label from "Reporting" to "Reports"

## 4. MTU Usage Summary report

- [x] 4.1 Implement the scoped query: MTU-selected classes, at least one active attendance, not cancelled, class date (`MIN(classComponents.startsAt)`) within the range
- [x] 4.2 Implement the period totals: instructor hours, student hours, students, sites
- [x] 4.3 Implement the transportation section with separate van, POV, and department-vehicle mileage lines
- [x] 4.4 Implement the location and basic student list section
- [x] 4.5 Implement the course list section
- [x] 4.6 Implement the supplies section (totals across the period)
- [x] 4.7 Implement the equipment-use section
- [x] 4.8 Render the report as a PDF with `pdf-lib` and register it in the catalog
- [x] 4.9 Handle an empty time frame by producing the report with zero totals and empty sections

## 5. Remove the reporting queue

- [x] 5.1 Delete the `/staff/reporting` page, its action, and `ReportingDestinationControl`
- [x] 5.2 Remove `listReportingQueue` and its now-unused read paths
- [x] 5.3 Keep finalization writing destination-status rows and keep the `finalization_reporting_statuses` table (dormant) for the future Fire export

## 6. Verification

- [x] 6.1 Unit-test the period scope, totals math, and per-transport mileage aggregation
- [x] 6.2 Add an end-to-end test that generates the MTU Usage Summary and downloads the PDF
- [x] 6.3 Run lint, typecheck, and the test suite
