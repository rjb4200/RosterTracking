## 1. Reporting Status Migration

- [x] 1.1 Add a database migration that converts `reported` statuses to `entered`, permits `not_required`, and replaces the reporting status constraint.
- [x] 1.2 Update reporting status types, transition validation, and audit metadata for entered and not-required destination updates.
- [x] 1.3 Add service-level coverage for independent destination status changes and migrated reporting metadata.

## 2. Reporting Queue Data

- [x] 2.1 Extend reporting queue reads with destination, status, and class-date filters plus class date, lead instructor, and active attendee count context.
- [x] 2.2 Return destination and status workload summaries from reporting queue data without exposing unauthorized rows.
- [x] 2.3 Map supported Fire and KBEMS destination rows to their existing official roster PDF downloads while omitting FEMA PDF actions.

## 3. Training Major Workspace

- [x] 3.1 Replace the reporting configuration-led page with a filtered reporting work queue and workload summary.
- [x] 3.2 Add direct Mark entered and Mark not required controls that capture the authenticated actor and server timestamp.
- [x] 3.3 Provide needs-correction notes and optional external reference input with accessible pending, error, and success feedback.

## 4. Verification

- [x] 4.1 Add E2E coverage for independent Fire and KBEMS statuses, direct entry completion, not-required status, filters, queue PDF availability, and instructor access denial.
- [x] 4.2 Run migration, lint, typecheck, unit and integration tests, relevant E2E tests, build, and strict OpenSpec validation.
