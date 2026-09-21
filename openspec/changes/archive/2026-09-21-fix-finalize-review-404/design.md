## Context

See proposal.md for motivation. The completed-class review route (`src/app/staff/(protected)/classes/[id]/review/page.tsx`) is gated to `status === "completed"`. Both `finalizeClassAction` and `reopenClassAction` mutate the class status and revalidate that same review path, so the route re-renders into `notFound()` when the status it just changed to no longer matches the gate. The class detail route (`classes/[id]/page.tsx`) already renders completed and finalized states side by side, including `getFinalizationHistory`, `FinalizationControls`, and `OfficialRosterControls`, and is the reference for the finalized composition.

## Goals / Non-Goals

**Goals:**
- Make the review route valid for both `completed` and `finalized` so finalizing in place keeps the operator on the screen.
- Keep the finalized view read-only and expose the reopen path.
- Reuse the existing finalization controls and history rather than adding new services.

**Non-Goals:**
- Changing the finalization or reopen services, authorization, snapshotting, or reporting behavior.
- Broadening roster mutation access; finalized classes stay immutable outside the audited reopen.
- Changing the reopen lifecycle target (reopen continues to return the class to its editable `open` state).
- Redesigning the live command screen or the class detail route.

## Decisions

### Widen the review gate instead of redirecting

Accept `completed` and `finalized` on the review route and branch the rendered content on status. Redirecting after finalize was the simpler alternative but discards the operator's review context and the locked revision they just created; the user chose for the review screen to own both states.

### Finalized review view is the class detail finalization section

For `finalized`, render the class summary and roster read-only, omit `AttendanceControls` and `AddAttendanceForms`, and compose `getFinalizationHistory` with `FinalizationControls` (reopen branch) and `OfficialRosterControls`, mirroring the class detail page. Roster-mutating services already reject finalized classes, so omitting the controls matches server behavior rather than adding a new guard.

### Reopen returns to the class detail route

Reopening sets the class to `open`, which is outside the review route's purpose and would re-trigger the gate. On successful reopen the review screen SHALL navigate to the class detail route, which already renders the editable live-class state. Rendering the open/live state on the review route was rejected as duplicating the live command screen.

### Keep server-side readiness authoritative

The readiness summary stays advisory on the completed view; the transaction-time finalization validation remains authoritative. On the finalized view the readiness summary is replaced by the locked/finalized state.

### Finalized roster reads reuse the roster read path

`getClassRoster` rejects any status outside `open`/`completed`, so a finalized review could not load roster rows. Extend that read allowlist to include `finalized` rather than decrypting the finalization snapshot or hiding the roster. Mutation stays safe because write services call the separate `requireMutableRosterClass` guard, which continues to reject finalized classes; the read allowlist and write allowlist are independent. This narrows the original "no service-layer change" expectation, which is why the proposal was updated alongside this design.

## Risks / Trade-offs

- [Editing affordances appear on a finalized roster] -> Branch rendering on status and rely on existing service-level mutation rejection as the backstop.
- [Reopen still lands on a not-found] -> Navigate to the class detail route on successful reopen instead of re-rendering the review route.
- [Finalized UI duplicated between review and class detail] -> Accept short-term duplication, reusing the same components and data loaders so the two views stay consistent.
- [The `revalidatePath(".../review")` calls in the actions] -> Now safe because the route accepts the finalized status; no action change is required for the finalize path.

## Migration Plan

1. Deploy the route/rendering change; no database migration.
2. Verify finalize-in-place, finalized read-only review, and reopen-from-review flows with integration and E2E coverage.
3. Roll back by reverting the application change.
