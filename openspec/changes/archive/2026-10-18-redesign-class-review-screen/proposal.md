## Why

The review screen is the one place an instructor reconciles attendance and signs a class, but it tries to be three things at once: a finalization workbench, a class editor, and a session/instructor editor. The result is a long single column where the sign action sits near the top, the records it depends on sit near the bottom, empty sections always render, readiness issues name raw attendance IDs, and a Mobile Training Unit class shows the same MTU editor twice. The certification and MTU confirmations are buried between form fields, so finalizing takes more than a few seconds. Instructors also could not record a class that ran long: raising a session's hours raised the ceiling without carrying the extra hours to the participants who attended.

## What Changes

- Restructure the open-class review screen into three ordered steps: **1 Confirm class** (class details, instructors, sessions, and MTU usage, each editable inline and collapsed to a summary), **2 Review roster** (a compact table with one row per participant that expands only when a row needs attention), and **3 Finalize & export** (one action block: certification, signature, finalize).
- Make finalizing a few-second action: certification and signature only, with no draft and no editing in the finalize step.
- Capture MTU usage once, on the Confirm class step, as grouped collapsible sections for equipment, supplies, transport, and additional details; finalizing requires recorded usage instead of a separate confirm step.
- Record a class that ran long by raising the scheduled total, carrying the new total to every active participant still at the previous total and leaving individually adjusted participants unchanged.
- Name roster-readiness issues by participant, and render optional sections only when they have content.
- Keep multi-session classes (sessions map to distinct subjects on one roster day).
- Not changing: the per-participant credit bound, sign-in, destination-driven reporting, official roster and certificate PDFs, or the reopen path.

## Capabilities

### New Capabilities

<!-- None: this change reorganizes an existing screen and adjusts existing rules. -->

### Modified Capabilities

- `guided-roster-finalization`: the review screen is three ordered steps; Confirm class edits inline and the roster is a compact table that expands on issues; the finalize step is certification and signature only; MTU usage is grouped and saved on the Confirm class step; readiness issues name participants; empty sections are omitted.
- `instructor-roster`: raising the class scheduled total carries the new total to active participants still at the previous total, while individually adjusted participants keep their credited hours and reason.
- `mtu-usage-tracking`: MTU usage is edited on the review screen's Confirm class step while the class is open, replacing the standalone editor that was editable at any time; changing it after finalization requires reopening.

## Impact

- `src/app/staff/(protected)/classes/[id]/review/page.tsx` — rebuilt as three ordered steps with a compact roster and inline Confirm class editing.
- `roster-controls.tsx`, `roster-actions.ts` — the class-ran-long adjustment; the compact roster row.
- `mtu-usage-form.tsx` / `mtu-usage-fields.tsx` — MTU editing moves to the Confirm class step with grouped sections.
- `finalization-controls.tsx` — the finalize step becomes certification + signature only.
- `src/modules/classes/finalization.ts` — require recorded MTU usage instead of a confirm payload.
- `src/modules/classes/services.ts` — propagate a raised scheduled total to participants at the previous total.
- `src/modules/instructor-roster/services.ts` — the propagation rule and participant-named readiness issues.
- `src/app/globals.css` — step, roster-table, and grouped-section styles.
- No schema migration and no change to sign-in, output generation, or the reopen path.
