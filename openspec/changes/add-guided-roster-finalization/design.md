## Context

Completed classes are currently readable but roster mutations require open status, while finalization already revalidates and snapshots the roster. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Make completed state the instructor's editable roster-review period while keeping public sign-in closed.
- Reuse existing attendance audit, requirement snapshots, finalization snapshots, and reporting-status services.
- Give the review screen one clear finalization decision after visible readiness checks.

**Non-Goals:**
- Add a lifecycle state, alter public student sign-in requirements, or redesign reporting queues and official roster rendering.
- Permit normal edits after finalization or weaken server-side validation.

## Decisions

### Completed is review, finalized is the lock

Permit roster add, remove, and credit mutation for open and completed classes. Completed continues to be the prerequisite for finalization and closes public sign-in. Finalized remains immutable except through existing audited reopen behavior. This avoids a migration and matches the existing lifecycle vocabulary better than adding a review state.

### Dedicated review route

Add a focused class review route rather than expanding the live command screen further. It composes the existing roster data, manual-entry forms, attendance controls, finalization controls, and a small readiness summary. The class detail screen links to review after attendance closes.

### Reason selector keeps stored free text

Use a client-side selector for standard reasons and require accompanying text only for Other. Persist the resulting text through the existing adjustment-reason field, preserving existing audit and schema constraints without a migration.

### Readiness is advisory before authoritative finalization

Expose completion/readiness errors in the review screen where practical, but retain the existing transaction-time finalization validation as authoritative to prevent stale or concurrent edits from finalizing invalid data.

## Risks / Trade-offs

- [Completed becomes editable for roster data] -> Limit mutation authorization to assigned instructors and elevated staff, keep sign-in closed, and revalidate during finalization.
- [Review duplicates live roster UI] -> Reuse roster controls and data models; the review route only adds workflow framing.
- [A readiness summary becomes stale] -> Treat it as guidance and show server-action errors from finalization.

## Migration Plan

1. Deploy lifecycle authorization and the review route together.
2. Verify open, completed review, finalized lock, and elevated-staff flows with integration and E2E tests.
3. Roll back application changes without a database migration.
