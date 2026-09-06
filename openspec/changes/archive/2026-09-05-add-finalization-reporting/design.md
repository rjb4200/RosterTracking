## Context

Phase 6 completes roster validation and retains attendance history. Phase 7 makes those facts immutable for reporting while keeping corrections explicit. See `proposal.md` and the delta specs for behavioral scope.

## Goals / Non-Goals

**Goals:**
- Produce immutable, numbered finalization revisions from locked current facts.
- Keep destination reporting state independent and auditable.
- Permit controlled correction without mutating history.

**Non-Goals:**
- Do not generate official PDFs, submit to external agencies, or define agency form rules.
- Do not decrypt or expose protected credential snapshots beyond authorized server-side revision capture.

## Decisions

### Snapshot every finalization input

Revision records will store a structured immutable snapshot of class and roster facts plus destination-specific reporting records. This isolates historical output from later edits. A normalized revision table with protected snapshots is preferred over querying mutable live records at reporting time.

### Reopen creates a new revision lineage

Finalization locks normal editing. An authorized, reasoned reopen returns the class to a correction state; re-finalization creates the next revision number. Prior revisions are never overwritten or deleted.

### Separate destination statuses

Fire, KBEMS, and FEMA statuses will be rows keyed by revision and destination, with pending, reported, and needs-correction states. This avoids coupling outcomes across agencies and supports focused queues.

### Separate roster and reporting authority

Assigned instructors may finalize and reopen their own classes, while Training Majors and Administrators retain reporting-destination authority. This keeps class operations with instructors without allowing external reporting state to be changed by non-reporting staff.

## Risks / Trade-offs

- [Snapshot scope misses a form-relevant field] -> Capture the full known class, instructor, attendance, agency, attestation, credit, and reporting snapshot set; add verified official-form fields in Phase 8.
- [Reopen races reporting updates] -> Lock the class and active revision during lifecycle and reporting mutations.
- [Revision snapshots contain protected data] -> Reuse application encryption and sanitized audit logging boundaries.

## Migration Plan

1. Add revision, snapshot, reopen, and reporting-status tables additively.
2. Deploy authorization and transaction services before staff UI.
3. Enable finalization locks and reporting queues after revision reads are available.
4. Retain all created revisions on rollback; disable new commands rather than deleting historical data.
