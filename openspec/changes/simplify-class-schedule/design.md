# Design

## Context

See proposal.md — Why. Classes already store one or more `class_components` rows with independent start and end times, position, credited hours, subject facts, and a method. All components must fall on one department-calendar day. The KFS-1A prints the first two subjects; training notices print up to five subject rows; reports sum credited hours. The creation wizard currently gives every Fire subject the class-level duration and places the second subject after the first.

## Goals / Non-Goals

**Goals:**
- Make the class schedule one start time plus ordered subject durations.
- Derive every subject start and end sequentially with no gaps.
- Keep the class total as the sum of subject durations.
- Use one class-level method set for every subject.
- Normalize existing open classes on edit without touching finalized history.

**Non-Goals:**
- No multi-day classes.
- No per-subject method overrides or independent session starts.
- No new database table or column.
- No change to KFS-1A layout, certificate layout, or report totals.

## Decisions

### Reuse `class_components` as ordered subject blocks

Keep the existing table and rows. Each row becomes an ordered subject with a duration; `startsAt` and `endsAt` remain stored, but are derived on save rather than entered independently. This avoids a schema migration and keeps the finalization snapshot, reports, KFS-1A, and notices working with their current component shape.

Alternative considered: replace components with a one-to-one class schedule and separate subject table. Rejected because it is a larger migration with no behavioral gain and would rewrite historical output paths.

### One class start, derived sequential starts

Treat the first component's start as the class start. On save, order subjects by position and set:

```
subject[0].start = class start
subject[n].start = subject[n-1].end
subject[n].end   = subject[n].start + subject[n].duration
```

No gap field is stored. The same-day rule remains; a derived schedule that crosses the department-calendar day is rejected.

Alternative considered: keep optional gap/break fields. Rejected because the requested model is strictly back-to-back and a gap would add back the complexity this change removes.

### Class total is the sum of subject durations

Continue deriving the scheduled total from the components. Attendance credit defaults to that total, and the existing "class ran long" behavior raises it when a subject duration increases.

Alternative considered: store a separate class total. Rejected because it duplicates component state and can drift.

### One class-level method set

Derive the method set from the class delivery methods and apply it to every subject. Remove the per-subject method control and the previous "preserve an override" logic. A class with Classroom and Hands-On delivery therefore carries CR and HO on each subject row.

Alternative considered: keep per-subject methods for mixed-method days. Rejected by the simplification decision; one class with both methods selected covers the classroom-plus-hands-on case.

### Capture durations where subjects are defined

The class-and-schedule step collects the class start. For a class without Fire subjects, it collects the single subject duration. For a Fire class, each Fire subject row collects its duration and the review shows the derived total. The session editor edits subject durations and shows derived times; it does not collect independent starts.

Alternative considered: keep a separate class duration and per-subject durations. Rejected because the two values can disagree; the class total must come from the subject durations.

### Normalize existing open classes on edit

Finalized revisions keep their stored facts. When an existing open class is next saved, recompute its component starts and ends from the stored first start and the ordered durations, and rewrite stale methods to the class method set. No one-time migration is needed.

Alternative considered: a one-time data migration. Rejected because normalized-on-save is simpler and avoids rewriting data that may never be edited.

## Risks / Trade-offs

- [Existing open classes may have gaps or independent starts] → Normalize on the next save; show the derived times before save so the change is visible.
- [Existing classes may have more than two components] → Keep existing rows readable; do not offer a new subject beyond the supported two-subject cap, and do not delete historical components.
- [A long duration can cross midnight] → Keep the one-roster-day validation and reject derived schedules that leave the class's calendar day.
- [Changing delivery methods overwrites legacy mixed methods] → Every subject is intentionally brought to the class method set; record the change in the existing component audit event.
- [Users may expect a lunch break] → The model is deliberately back-to-back; document that a gap is not supported.

## Migration Plan

1. Update the creation wizard inputs and review to collect one start and subject durations.
2. Update class services and validation to derive ordered starts/ends and the summed total.
3. Update the session editor to edit durations and display derived times and one class-level method set.
4. Normalize existing open classes on save; leave finalized revisions unchanged.
5. Run unit and browser coverage for single- and dual-subject classes, derived times, summed totals, method changes, and day-boundary rejection.
6. Rollback: revert the code change. Stored component starts and ends remain valid because the old model is a superset of the new derived values.

## Open Questions

None.
