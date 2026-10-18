## Context

`guided-roster-finalization` is the review page's owner spec. Its opening requirement, "Guided after-class roster review", now carries nineteen scenarios covering the three-step layout, the compact roster, the documents list, the finalized record, and the reopen path; four further requirements add credit reasons, finalization, certificate delivery, training notices, MTU handling, and the class-runs-long adjustment. The screen inherits that sprawl: the class-details editor and an MTU editor are mounted inside a step, collapsible sections nest inside collapsible sections, a summary and a full form show the same facts, and readiness issues are listed without saying which control resolves them.

Two facts constrain the restructure:

- OpenSpec **MODIFIED cannot drop scenarios** — archiving aborts if a modified requirement loses one (seen when archiving the review screen). Restructuring a requirement whose scenarios change therefore means **REMOVE + ADD**, not MODIFY.
- **`add-assistant-instructors` (active) also edits this capability** and **removes** "The lead instructor finalizes and signs from the review screen". Any change that also removes that requirement would collide at archive time.

## Goals / Non-Goals

**Goals:**
- One post-class workspace with two states: a review state, and correction on demand.
- A single editing surface per area, one editor at a time, no nesting.
- Readiness that says what is wrong and links to the fix.
- A compact finalization panel; documents and delivery out of the pre-finalization flow.

**Non-Goals:**
- Renaming the capability (deferred).
- Changing finalization, sign-in, PDF output, the credit bound, the rules that live in other capabilities, or the class-runs-long propagation.
- A drag-and-drop schedule builder or inline attendance entry.

## Decisions

**Two states, one workspace.** The open-class workspace opens in review state (summaries + readiness + finalization) and reveals an area's editor only when Edit is chosen. *Alternative:* keep the three ordered steps — rejected; the steps still amount to an always-open page and the spec's "three steps" phrasing is what produced the nesting.

**Five correction areas own all editing.** Class & reporting, Schedule & hours, Instructors, Roster, MTU usage. One editor per area, one area open at a time, MTU shown only when the destination is selected. This is also the rule that kills the two-MTU-editors problem: MTU has exactly one surface in this workspace.

**Actionable readiness.** Each blocker names the participant (or fact) in plain language and carries a control that opens the area holding it. *Alternative:* list issues without links (today's behaviour) — rejected as the main source of "which form do I fix?".

**Documents and delivery move behind a revision.** The sign-in record, audit log, KFS rosters, certificates, training notices, and per-participant delivery move into one section exercised after finalization. Recorded trade-off: the **audit log has no other in-app link while a class is open**, so this is a real (accepted) loss of an open-class convenience; the sign-in record keeps its own page route. If it proves needed during correction, it comes back as one line in the review state rather than a whole section.

**Keep the capability name.** `guided-roster-finalization` stays; only its requirements change. Renaming to `post-class-review` is a structural spec move (specs are identified by directory), it orphans the active `add-assistant-instructors` delta that targets this capability, and it buys nothing the requirements cannot express. Revisit after the assistant change lands.

**Restructure by REMOVE + ADD for the over-broad requirement.** Because MODIFIED cannot drop scenarios, "Guided after-class roster review" (19 scenarios, five jobs), "The review screen manages certificate delivery", "The review screen offers on-demand training notices", and "MTU classes require recorded usage before signing" are REMOVED with a reason and migration, and replaced by focused requirements. This is also the size win: one requirement doing five jobs becomes single-purpose requirements.

**Do not remove the finalize requirement.** "The lead instructor finalizes and signs from the review screen" is MODIFIED (body only, scenarios retained) rather than removed, so archiving this change never consumes what `add-assistant-instructors` is going to remove. Sequencing is recorded in the risks.

## Risks / Trade-offs

- [The audit log becomes unreachable while a class is open] → Accepted for now; the sign-in record keeps a page route. Add a single review-state link if correction work needs it.
- [Nesting returns] → The one-editor-per-area rule and "SHALL NOT render every configuration form at once" forbid it; the MTU editor carries no inner collapsibles.
- [Scenario coverage lost in the restructure] → A keep/move/replace ledger in the specs: compact roster with expand-on-issue, participant-named issues, empty-section omission, enumerated credit reasons, signer authorization, MTU gating, email reveal, and reopen authorization are all carried into the new requirements.
- [Collision with `add-assistant-instructors`] → This change does not remove the finalize requirement; land the assistant change first or retarget it if it is reworked.
- [The rename is deferred] → Recorded as an explicit non-goal with the orphan rationale, so it is not forgotten.

## Migration Plan

No schema change and no data migration. Ship as a page restructure plus spec restatement; rollback is reverting the page and the spec change. The workspace is a single route, so no redirects are involved.

## Open Questions

- Whether the capability is ultimately renamed to `post-class-review`, and when (after the assistant change).
- Whether the audit log needs an open-class entry point after all.
- Whether removing the only session or the last lead stays refused or gains a confirmation (unchanged from the deleted edit-screen change).
