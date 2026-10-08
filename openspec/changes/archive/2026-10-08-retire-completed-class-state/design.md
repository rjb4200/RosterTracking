## Context

See proposal.md — Why. Current facts that shape the approach:

1. **`completed` is a real lifecycle state.** `CLASS_STATUSES` has `open`, `completed`, `finalized`, `cancelled` (`src/modules/classes/constants.ts:11-16`); the DB check allows all four (`src/server/db/schema/classes.ts:103`); `classes.completed_at` exists.
2. **Completion and finalization have different authorization.** `transitionClass(open → completed)` requires only class access (`src/modules/classes/services.ts:746-801`, `policy.ts:67-71`), while `finalizeClass` requires the lead instructor (`finalization.ts:333-350`, `requireLeadInstructorAccess`). A non-lead who completes the class is then told only the lead can finalize (`finalization-controls.tsx:35,56-60`).
3. **Readiness is checked only at finalize.** Completion deliberately skips roster validation so corrections happen on the review screen (`services.ts:760-762`, spec `class-management` "Complete an open class").
4. **The review screen already adapts to status.** It renders for `completed` (editable corrections + sign) and `finalized` (read-only record), and 404s otherwise (`review/page.tsx:82-84`).
5. **Manual attendance entry exists twice.** On the open class page (`[id]/page.tsx:132-140`) and the review screen (`review/page.tsx:436-446`), backed by `addManualRegularAttendance`/`addManualGuestAttendance` (`roster-actions.ts:58-74`). Manual rows carry a `manual` sign-in method and no attestation.
6. **MTU usage is snapshotted but not rendered.** `buildSnapshot` copies `mtu_usage` into the encrypted revision. The official roster snapshot type includes it, but neither roster renderer nor approved field mapping uses it.
7. **Reopen already returns to `open`** (`finalization.ts:484-487`), and `assertClassEditable` already treats only `finalized`/`cancelled` as locked (`policy.ts:81-88`).

## Goals / Non-Goals

**Goals:**
- Make the lead instructor's finalize the only action that closes a class, and let it go `open → finalized` directly.
- Remove the accidental limbo state and the non-lead strand.
- Keep the correction workbench (class details, sessions, instructors, credit adjustment, removal) reachable without a persistent intermediate status.
- Preserve the signature semantics of attendance by removing staff-entered rows.
- Treat MTU usage as live operational data so it can change after finalization.

**Non-Goals:**
- No new MTU PDF or changes to official roster fields or layout.
- No change to the permission model; the lead-instructor rule already governs finalization.
- No new intermediate/sub-state for sign-in closure.
- No change to public student sign-in or self-registration.

## Decisions

**D1 — Remove the `completed` state; finalize directly from `open`.** `validateFinalizationTransition` checks `open` instead of `completed` (`policy.ts:90-94`), and the finalize update guards on `open` (`finalization.ts:437-445`). The reopen path is already `finalized → open`, so the reduced state machine needs no new state.
- *Alternatives:* keep `completed` but make its only exit finalize (still allows the non-lead strand and the limbo page); add a dedicated `awaiting_finalization` state (a rename, not a simplification).

**D2 — Finalization closes sign-in; no separate close action.** Because the actor who finalizes is always the lead and finalization is the intended close, closing public sign-in is folded into finalization. Sign-in remains live while the class is open. `Public token resolution is state-limited` already resolves only for an `open` class, so nothing new is needed beyond removing the retired status from its enumeration.
- *Alternatives:* a `sign_in_closed` flag on `open` classes — rejected as reintroducing the intermediate state the change removes. Raw-token rotation does not close stable public-code access.

**D3 — The review screen serves both roles (Option B).** The route stays; its gate becomes `open` or `finalized`. While `open` it is the finalize-and-correct workbench; while `finalized` it is the read-only record. This reuses the existing corrections, readiness, documents, and revision history with minimal churn, and gives the finalized record a canonical home.
- *Alternatives:* inline finalization on the live command screen (large UI move and duplicates the workbench); a separate `finalize` route (splits one screen into two).

**D4 — Add a read-only Class details summary near the top, from one shared component.** The summary is the same field list the class detail page renders (`[id]/page.tsx:157-190`). Extract it so both pages render identically; the detail page pairs it with its "Edit class details" link, the review screen pairs it with inline correction affordances.
- *Alternatives:* duplicate the markup (drifts); omit it (the review screen would lose the summary the detail page provided).

**D5 — Remove manual attendance entry.** A valid attendance is a person's own attestation. A staff-entered row has no signer, so presenting it as attendance misrepresents the record. Remove `AddAttendanceForms`, the `regular`/`guest` operations, and the two `addManual*` services. Public self sign-in and guest self-registration remain the only sources of attendance.
- *Alternatives:* keep manual entry but flag it as unattested (still lets an unsigned row appear in a signed roster); restrict it to guests (same integrity problem).

**D6 — MTU usage is operational and edited independently.** Display current `mtu_usage` in a dedicated review-page form. Authorize updates with class access, validate only MTU fields, and audit each update without unlocking class or attendance facts. Stop copying MTU into new finalization snapshots; retain existing historical snapshots untouched. Official roster renderers do not use MTU and remain revision-based.
- *Alternatives:* keep MTU locked in the revision (contradicts "no lock"); update the revision in place on MTU edit (violates revision immutability).

**D7 — Class-list link targets follow the state.** Open entries link to the live command screen; finalized entries link to the review record. The list no longer has a Completed status or filter.
- *Alternatives:* send everything to the review screen (breaks the open command screen's live roster).

**D8 — Migrate the schema by resolving existing `completed` rows first.** A migration drops `completed` from `classes_status` and retires `completed_at`. Because the constraint change fails against existing `completed` rows, the migration must first move them (to `open`, requiring the class to be reviewed and finalized) or the deploy must confirm none exist. The database currently holds test data.
- *Alternatives:* leave `completed` in the constraint but unused (schema lies about the domain).

## Risks / Trade-offs

- [Sign-in stays open until finalize] → accepted; the class is open work and the overdue reminder surfaces stale open classes past their session. Finalization and sign-in must serialize on the class row so the signed revision includes all accepted attendance.
- [Removing manual entry blocks a walk-in who did not sign in] → accepted as the point of the change; staff can have the person complete the public sign-in on a device.
- [MTU editing could accidentally unlock signed facts] → use a dedicated MTU-only action; keep ordinary class and roster locks intact. MTU edits do not alter official PDF output.
- [Dropping a status touches many specs and tests] → the delta specs in this change update every affected capability, and the tasks sequence the code and test changes.
- [The review screen gains a second gate value] → a single `open || finalized` guard keeps the 404 for cancelled/absent classes.
- [Class-list e2e rows key on `a[href="/staff/classes/${id}"]`] → finalized rows change to `/review`; update the selector to match by class name or accept either href.

## Migration Plan

No new columns. Drop `'completed'` from the `classes_status` check and retire `completed_at`; resolve any existing `completed` rows (move to `open`) before applying the constraint. Deploy app and migration together; rollback is reverting the commit and re-adding the constraint value.

## Open Questions

None blocking. Where finalization and corrections live, how sign-in closes, and how MTU is sourced are all decided above.
