## Why

The review-screen spec has grown into one requirement ("Guided after-class roster review") that carries nineteen scenarios doing five different jobs — the three-step layout, the compact roster, the documents list, the finalized record, and the reopen path — while separate requirements layer certificate delivery, training notices, and MTU handling on top. The screen itself reflects that: it renders the class-details editor and an MTU editor inside a step, nests collapsible sections inside collapsible sections, shows a summary and a full form for the same facts, and names readiness problems without saying which control fixes them. The model should be one workspace with two states — review, and correction on demand — rather than a page that mounts every editor at once.

## What Changes

- Restate the review screen around **one post-class workspace**: a concise summary of the class, schedule, instructors, reporting destinations, roster, and finalization, each area offering **Edit** that opens only that area's editor. Correction controls are shown on demand; the workspace SHALL NOT render every configuration form at once.
- Define **five correction areas** (Class & reporting, Schedule & hours, Instructors, Roster, MTU usage) as the only editing surface, each with one editor.
- Make **readiness actionable**: the workspace shows *Ready to finalize* or *Needs correction*, lists each blocker in plain language, and links each to the correction area that fixes it.
- Keep **finalization short**: a compact panel with the certification, the typed signature, and the Finalize action, with no extra data-entry unless a selected destination is missing information.
- Make **MTU destination-specific**: MTU usage is shown only for a class that reports to the Mobile Training Unit, and missing usage is a readiness issue that opens the MTU editor — never a second confirm step in finalization.
- Move **documents and delivery** (sign-in record, audit log, KFS rosters, certificates, training notices, per-participant delivery) into one section that is exercised after a revision exists; the working flow before finalization is the workspace alone.
- Keep the **locked finalized record** on the same route: read-only signer, timestamp, revision, and outputs, with reopening a clearly separated, reason-required action that retains prior revisions.
- **Not changing:** the capability name (a rename to `post-class-review` is deliberately deferred — see design), the credit-adjustment reasons, the pre-lock reporting-context reconciliation, the class-runs-long propagation rule, or any other capability's requirements.
- **Nothing is deleted outright.** Behaviours are kept, moved, or replaced: the compact roster table with expand-on-issue, participant-named issues, the empty-section omission, the enumerated credit reasons, and the signer authorization all carry forward.

## Capabilities

### New Capabilities

<!-- None: this restates one existing capability's requirements. -->

### Modified Capabilities

- `guided-roster-finalization`: restated as one post-class workspace with a review state and on-demand correction; actionable readiness; destination-specific finalization checks; a compact finalization panel; a documents-and-delivery section; and a locked finalized record. The layout requirements ("three ordered steps", the always-present documents list, and the grouped-collapsible MTU step) are replaced.

## Impact

- `src/app/staff/(protected)/classes/[id]/review/page.tsx` — restructured to the workspace: summary areas with per-area Edit, an actionable readiness list, and a compact finalization panel.
- `roster-controls.tsx` — the roster area's compact rows and adjustment controls.
- `mtu-usage-form.tsx` / `mtu-usage-fields.tsx` — one MTU editor with no nested collapsibles.
- `finalization-controls.tsx` — the compact certification/signature panel.
- `src/app/globals.css` — workspace, summary-area, and readiness styles.
- No schema migration and no change to finalization, sign-in, or output generation.
- **Coordination:** `add-assistant-instructors` (active) also edits `guided-roster-finalization`; see the design for sequencing. The capability rename is out of scope here.
