## Context

The review screen (`src/app/staff/(protected)/classes/[id]/review/page.tsx`) is a single route that serves two roles: an open class is finalized there, and a finalized class is read there. It renders its content as one flat column of roughly a dozen sections; the ones that matter for signing (attendance credits) sit below the sign action, empty sections always render, the same MTU data appears in two separate editors, and readiness issues leak attendance record identifiers.

Two independent hours concepts meet here. The class scheduled total is derived, never stored: it is the sum of `class_components.credited_hours`. Each participant's `attendance.credited_hours` defaults to that total at sign-in and may be set only from zero through the current total. A session's end time is likewise derived (`endsAt = startsAt + creditedHours`), so "a class that ran long" has no stored actual-end signal — the only lever is the schedule.

## Goals / Non-Goals

**Goals:**
- Make the open-class workflow read as an ordered checklist: reconcile attendance, confirm reporting/MTU, sign.
- Let an operator record a class that ran long by raising the scheduled total, carrying the increase to the participants who were present.
- Present at most one MTU editor, and hide sections that have no content.
- Replace internal identifiers in readiness issues with the participant they concern.

**Non-Goals:**
- Consolidating the review and edit screens (the edit screen is a separate in-flight change).
- Changing the per-participant bound, sign-in defaults, output generation, certificates, or the reopen path.
- Allowing an individual participant to exceed the class scheduled total.
- Any schema change.

## Decisions

**One change, not two.** The hours behavior and the layout both land on `review/page.tsx` and `roster-controls.tsx`; splitting them would leave two in-flight changes editing the same files. The concerns stay separate as distinct capability deltas (`instructor-roster` for the rule, `guided-roster-finalization` for the screen, `mtu-usage-tracking` for the retired editor). *Alternative:* a dedicated behavior change plus a layout change — rejected for the file-ownership overlap.

**Propagation lives on the schedule write path, not only the review affordance.** Raising the total must credit participants-at-the-previous-total no matter which surface raised it, so the rule belongs where the class scheduled total changes (session save), not in a review-only action. *Alternative:* implement propagation only in the review action — rejected because the edit screen's session editor changes the same total and would silently diverge.

**Raise only participants at the previous total.** A participant adjusted below the total (late arrival, left early) keeps their value and reason; a participant at the full total follows the new total. This preserves the invariant that class hours are the hours of record and keeps the row, header, and certificate in agreement. *Alternative:* proportional scaling or blanket assignment — rejected as surprising and destructive to recorded adjustments.

**The finalize step is the only MTU editor.** The confirmation already exists and carries the required attestation, so the standalone editable section is retired. *Alternative:* keep the standalone section and drop the finalize editor — rejected because the attestation is a signing requirement.

## Risks / Trade-offs

- [Retiring the standalone MTU section removes the after-finalization edit path and the "editable at any time" requirement] → Flag it in the proposal and spec (removal with reason and migration); correcting MTU after signing requires reopening. If post-signing corrections turn out to be needed, add a read-only view plus a reopen-based edit instead of restoring the second editor.
- [Propagation writes many attendance rows at once] → Perform it in one transaction with per-row audit, and only for participants at the previous total, so a partial-credit participant is never silently rewritten.
- [Raising the total can strand participants who were at the old total via a different surface] → Put the rule on the shared schedule write path so no surface bypasses it.
- [Collapsing sections could hide something an operator needs] → Keep the three workflow cards open by default and collapse only secondary content (documents, revision history, corrections); hide only sections with no content.

## Migration Plan

No schema change and no data migration. Ship the page and rule change; existing classes keep their stored credits. Rollback is reverting the change.

## Open Questions

- The early-leaver rule is locked to "stays put" for this change; confirm it is the intended business rule before implementation.
- Whether to delete the standalone MTU form/action outright or leave it dormant pending the finalization-step work.
