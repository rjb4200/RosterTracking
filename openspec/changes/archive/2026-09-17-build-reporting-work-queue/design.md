## Context

The existing reporting page joins finalized revisions and reporting destination statuses into separate pending and correction lists. Status updates already run through a reporting-permission-protected transaction, record the authenticated actor and server timestamp, and write an audit event. The status constraint currently uses `pending`, `reported`, and `needs_correction`; Fire and KBEMS have approved PDF mappings, while FEMA has none.

## Goals / Non-Goals

**Goals:**
- Make `/staff/reporting` a destination-specific operational queue for Training Majors.
- Preserve independent per-revision reporting progress and existing reporting metadata.
- Provide simple status actions that do not ask staff to supply actor or timestamp values.

**Non-Goals:**
- Generate a FEMA roster PDF or add external reporting-system integrations.
- Change finalized roster contents or official roster PDF rendering.
- Change instructor reporting authorization.

## Decisions

### Rename stored completion status to `entered`

Replace the stored `reported` status with `entered` and add `not_required`. A database migration will update existing `reported` rows to `entered` before replacing the status constraint.

Using `entered` makes the state match the Training Major action language. Keeping `reported` as a storage alias was rejected because it leaves the data model and UI vocabulary inconsistent.

### Build one filtered queue query and derive summaries from its result set

Extend reporting queue reads to accept optional destination, status, and class-date filters and return row context needed to complete work. Return workload counts grouped by destination and status alongside the filtered rows.

This keeps the page centered on queue work and avoids separate destination-specific views. Loading every row and filtering in the browser was rejected because filters and counts must represent the same authorized, server-side result set.

### Use focused actions for routine reporting states

The queue will offer direct Mark entered and Mark not required controls. Needs correction will retain a notes input because the reason is meaningful operational context. Optional reference numbers remain available when recording or correcting external entry details.

A single unrestricted status select was rejected because it obscures the common completion path and invites invalid transitions.

### Reuse official roster delivery endpoints

Queue rows will map Fire to KFS-1A and KBEMS to KBEMS-E16, reusing existing authorized PDF endpoints. FEMA rows intentionally have no download action until a supported FEMA form exists.

## Risks / Trade-offs

- [Existing `reported` values become invalid under the new constraint] -> Update values in the same migration before applying the replacement constraint.
- [Queue joins could grow with reporting history] -> Filter finalized destination rows in SQL and index class-date/status query paths if query plans require it.
- [Operators may mark a destination complete accidentally] -> Keep audit records, allow a subsequent needs-correction update, and expose current status clearly.
- [A finalization revision can have multiple destination tasks] -> Use the revision and reporting-system pair as the queue row identity and mutate only that pair.

## Migration Plan

1. Apply a migration that converts `reported` to `entered`, permits `not_required`, and updates the status check constraint.
2. Deploy queue reads, focused status actions, and queue UI together.
3. Verify migrated entries retain their actor, timestamps, reference numbers, and notes.
4. If rollback is required, map `entered` back to `reported`; resolve any newly created `not_required` rows before restoring the old constraint.
