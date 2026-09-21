## Why

Finalizing a roster from the completed-class review screen leaves the operator on a route that immediately renders a 404. The review route is gated to `status === "completed"`, but finalizing flips the class to `finalized` and revalidates that same route, so the post-action render calls `notFound()`. The finalization itself succeeds — only the screen the operator is standing on breaks, which reads as a failed finalization and hides the locked revision they just created.

## What Changes

- Keep the completed-class review screen usable after finalization instead of redirecting away or 404ing.
- Let the review screen own both lifecycle states: an editable review while `completed`, and a read-only finalized view once `finalized`.
- On the finalized view, suppress roster-editing affordances (credit adjustment, manual attendance correction) that the roster services already reject outside `open`/`completed`, and present the locked revision instead.
- Surface the finalization outcome on the review screen: revision history, reporting destinations, reopen-for-correction, and official roster actions, matching what the class detail page already offers.
- Extend the roster read path to serve finalized classes read-only so the review screen can present the locked roster; attendance mutations keep their existing editable-status guard and remain rejected after finalization.
- Leave the finalization and reopen services, their authorization, immutable snapshots, and reporting behavior unchanged.

## Capabilities

### New Capabilities

<!-- None: this extends an existing review screen rather than introducing a capability. -->

### Modified Capabilities

- `guided-roster-finalization`: The dedicated after-class review screen must remain available after finalization, presenting the locked finalized state, revision history, and reopen path rather than ending in a not-found result.

## Impact

- Affects the completed-class review route (`src/app/staff/(protected)/classes/[id]/review/page.tsx`) and the controls it composes; the class detail route already renders finalized state and can be used as the reference behavior.
- Finalization controls already branch on `completed` vs `finalized`, so the reopen path is reusable as-is.
- No database migration and no change to finalization/reopen authorization. The only service change is a narrow read-allowlist extension in `getClassRoster` so finalized classes can be read; attendance mutation services keep their separate editable-status guard.
- Test coverage: the existing instructor-roster and finalization-reporting suites should still pass; a regression assertion that finalizing from the review route yields a finalized view rather than a 404 is expected.
