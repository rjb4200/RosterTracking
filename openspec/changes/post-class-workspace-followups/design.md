## Context

The post-class workspace shipped with three rough edges: a roster row that needs attention renders `<details open>`, so it expands itself; the MTU area's summary is the literal string "Recorded"/"Not recorded"; and the instructors card is the original single "Set lead instructor" form. Separately, a report says making a class longer still requires adding hours to each participant.

`saveClassComponent` already reads the previous scheduled total before the write and calls `carryRaisedScheduledTotal`, which moves every active participant at the previous total to the new total; a unit test covers the selection rule and an e2e test raises a session 4→5 and asserts the participant becomes `5.00`. The capability's rule (adjusted participants stay put) is intentional.

## Goals / Non-Goals

**Goals:** compact roster until opened; an informative MTU summary; add/remove/change instructor assignments.

**Non-Goals:** the signing model (which instructor signs), the ≤1-assistant rule from `add-assistant-instructors`, the finalize panel, documents/delivery, schema.

## Decisions

**Flag, don't expand.** The row keeps its attention tint and status text, but `<details>` no longer sets `open`. The operator opens the row. This keeps the compact table the workspace is built around.

**MTU summary from the recorded usage.** Derive a one-line summary from `classRecord.mtuUsage`: equipment names, supply names with quantities, transport with mileage, and any free-text extras; fall back to "Not recorded" when nothing is recorded. No new query — the detail is already loaded.

**Assigning, changing the lead, and removing.** `assignClassInstructor(isLead)` already demotes the other leads when `isLead` is true, so "make lead" is an assignment; adding an assisting instructor is the same service with `isLead: false`. A new `removeClassInstructor` deletes the assignment, refuses when it would leave no lead, re-checks the Fire instructor guard when Fire is selected, and audits. The service stays permissive about the number of assisting instructors; the `add-assistant-instructors` change's "at most one assistant" is a separate policy decision and is not enforced here.

**Propagation: keep the rule, prove it again.** The reported behaviour is verified against `dev`. If it reproduces, the fix is in `saveClassComponent`'s previous-total capture; if not, the rule stands and the report is documented.

## Risks / Trade-offs

- [Removing an instructor could leave the class unfinalizable] → Refuse removing the only lead; the Fire guard runs on change.
- [A summary line can be long] → Truncate to the first few items and let the editor show the rest.
- [Allowing many assisting instructors disagrees with `add-assistant-instructors`] → Recorded here; reconcile that change before applying it.
- [Propagation may still be reported as broken] → Keep the e2e test that raises session hours and asserts the participant follows; use it as the repro.

## Migration Plan

No schema change, no data migration. Rollback reverts the page/service changes.

## Open Questions

- Whether assisting instructors should be unlimited (this change) or at most one (`add-assistant-instructors`).
- Which instructor signs is unchanged and still owned by `add-assistant-instructors`.
