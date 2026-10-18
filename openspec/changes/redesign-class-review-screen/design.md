## Context

The review screen (`src/app/staff/(protected)/classes/[id]/review/page.tsx`) is where an open class is finalized and a finalized class is read. It grew into three jobs at once — a finalization workbench, a class editor, and a session/instructor editor — because the guided-finalization spec required class, session, and instructor editing "without leaving that screen". The result is a long single column: the sign action near the top, the records it depends on near the bottom, the same MTU data edited twice, and readiness issues that name internal record identifiers.

A class carries **one or more sessions** (subjects) that must fall on one roster day, each with its own reporting attributes and credited hours. The class scheduled total is always the sum of `class_components.credited_hours`; a session's end time is derived (`endsAt = startsAt + creditedHours`), so "the class ran long" is recorded by raising a session's hours. Participant credits default to the scheduled total and are bounded by it.

## Goals / Non-Goals

**Goals:**
- Read as one workflow: **1 Confirm class → 2 Review roster → 3 Finalize & export**.
- Make finalizing a few-second action: certification + signature only, nothing to edit.
- Show the roster as a compact table, expanding a row only when it needs attention.
- Present MTU usage as grouped collapsible sections on the Confirm class step, once.

**Non-Goals:**
- Removing multi-session classes (sessions map to distinct subjects on one roster day).
- A draft/save-state for finalization.
- Changing the per-participant credit bound, sign-in, outputs, or the reopen path.
- Any schema change.

## Decisions

**Three ordered steps replace the flat column.** Confirm class (inline, collapsing the class/instructor/session/MTU editors), Review roster (compact table), Finalize & export (one action block). *Alternative:* keep the previous card order — rejected; it left an informational card that did nothing and buried the sign action.

**No draft; finalize is atomic.** The user does not want a save-state, so the finalize step carries only the certification, the signature, and the button. *Alternative:* a persisted draft finalization — rejected as unnecessary state.

**MTU is captured once, on the Confirm class step.** The equipment, supplies, transport, and additional-details groups are editable and saved there; finalizing requires recorded usage rather than re-confirming it. *Alternative:* keep the confirm-at-finalize editor — rejected because it duplicated the editor and buried the attestation.

**The roster is a compact table that expands on issues.** One row per participant (name, status, credited hours, adjustment, actions); the detail (credential corrections, credit form) appears only when the row needs attention. *Alternative:* the current per-row stacked controls — rejected as the main source of clutter and length.

**Propagation stays on the shared schedule write path.** Raising the scheduled total credits participants still at the previous total no matter which surface raised it.

## Risks / Trade-offs

- [Changing finalize to require recorded MTU usage rather than a confirm checkbox touches the finalization server path and its tests] → Keep the recorded usage as the input; validate it at finalize; update the digital-signing and MTU tests alongside.
- [The compact table hides detail] → Expand a row on any invalid credit or missing reporting context, and keep the readiness summary in the finalize step.
- [Collapsing Confirm class could hide a needed edit] → Each group keeps a one-line summary with a visible edit affordance; nothing is removed, only collapsed.
- [Moving MTU editing inline while open relaxes "editable at any time"] → MTU changes after finalization go through reopen; recorded as an explicit spec change.

## Migration Plan

No schema change and no data migration. Existing classes keep their stored credits and usage. Rollback is reverting the change.

## Open Questions

- None blocking. Roster row status is Present/Removed with an issue flag.
