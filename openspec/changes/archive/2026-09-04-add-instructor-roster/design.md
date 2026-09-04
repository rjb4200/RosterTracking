## Context

Phase 5 records regular and guest attendance through a public, idempotent sign-in transaction. Phase 6 adds a staff-only operational layer over those retained records. See `proposal.md` and the instructor-roster and class-management delta specs for behavioral requirements.

## Goals / Non-Goals

**Goals:**

- Give assigned instructors a responsive roster for current class attendance.
- Preserve immutable sign-in facts while allowing retained attendance removal and bounded credit adjustments.
- Make manual attendance use the same participant, agency, and reporting-data validation as public sign-in.
- Prevent completion when the active roster is not ready for later finalization.

**Non-Goals:**

- Do not create permanent student records from instructor guest entry.
- Do not alter public sign-in, finalization revisions, reporting submission, or official PDF generation.
- Do not define agency-specific partial-credit or rounding rules beyond a decimal value from zero through the scheduled total.

## Decisions

### Use attendance as the roster source of truth

The roster will query attendance and its existing participant, agency, attestation, and reporting-context records rather than duplicating a roster table. Active and removed attendance remain distinguishable through retained removal metadata. This avoids diverging the instructor view from public sign-in facts.

Alternative considered: create a separate mutable roster-entry model. It was rejected because finalization would need to reconcile two participation records and removal history could drift.

### Reuse a common attendance command path

Manual regular and guest additions will use a staff-authorized attendance command path that shares participant, agency, requirement, snapshot, idempotency, and transaction validation with public confirmation while recording the manual method and staff actor. Staff commands will not require public workflow cookies or public rate limits.

Alternative considered: write separate instructor-only attendance tables. It was rejected because later finalization needs one consistent attendance model regardless of entry method.

### Store credit adjustments on attendance with retained audit facts

Attendance will receive credited-hours, adjustment-reason, adjustment actor, and adjustment timestamp fields as needed. New attendance defaults to the class scheduled total; any deviation requires a reason and remains bounded from zero through that total. Each mutation writes an audit event in the same transaction.

Alternative considered: derive credit solely from components at finalization. It was rejected because instructors need reviewable, actionable credit values before class completion.

### Enforce instructor assignment and lifecycle state server-side

Roster actions will require the requesting staff member to be an assigned class instructor and will lock/reload the class and attendance inside mutations. Additions and adjustments are available while the class is open; completion validation runs during the lifecycle transition and blocks invalid active attendance.

Alternative considered: rely on staff class-management permission alone. It was rejected because the roster must be limited to instructors assigned to the class.

### Keep removed attendance immutable and allow replacement only after removal

Removal retains all original facts and records the removal reason/actor/time. The existing active class/student uniqueness rule remains the guard for regular participants, so a new active attendance may be added only after the prior record is removed.

Alternative considered: hard-delete mistakes or reactivate a removed attendance. Both were rejected because they weaken the historical audit trail and create ambiguous finalization inputs.

## Risks / Trade-offs

- [Manual entry can bypass the public identification checks] -> Restrict it to assigned instructors, reuse active-student and required-data validation, and record the actor and manual method.
- [Roster edits can race class completion or another instructor action] -> Lock and revalidate class and attendance state within every mutation transaction.
- [Partial-credit policy may later need agency-specific rules] -> Retain precise credited hours and a reason now; defer agency-specific rounding rules until verified.
- [Wide rosters can be difficult to operate on tablets] -> Prioritize responsive rows, compact actions, pagination or bounded loading, and Playwright coverage at tablet and desktop viewports.

## Migration Plan

1. Add reviewed, additive attendance credit and removal metadata plus indexes and constraints required by roster queries.
2. Deploy server-side roster authorization and transaction services before exposing staff routes.
3. Deploy the instructor roster UI, then enable completion validation in the same release so incomplete rosters cannot transition to completed.
4. Roll back application code by disabling roster actions if necessary; retain additive columns and audit records because attendance history must not be removed.
