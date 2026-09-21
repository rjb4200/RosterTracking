## Why

Finishing attendance drops the operator back on the class page, which immediately offers a **Finalize roster** button but none of the tools to correct the class or its roster. Operators therefore finalize without reviewing anything, and when a roster does need correcting they cannot reach the only screen that can fix it — the review route refuses to render while the class is still open, and completion is blocked until the roster is already clean.

## What Changes

- **Finish attendance and review** completes the class and navigates to the review screen, instead of leaving the operator on the class page.
- The review screen becomes the **confirm-and-correct** step: class details (course, site, host agency, delivery method, reporting systems), sessions, instructors, active attendance credit and removal, manual attendance correction, and removed attendance — all in one place, with the finalization action at the end.
- The class detail page no longer offers finalization for a completed class; it points to the review step, so there is one door to finalizing and it is the door with the editing tools.
- **BREAKING** (spec-level): completing a class no longer validates the roster. Roster readiness moves to finalization, which already enforces it, so an operator can complete a class into review while its roster still needs work and then fix it on the screen they were sent to.
- Finalization remains unavailable while the roster has unresolved issues, and the review screen names them.

## Capabilities

### New Capabilities
<!-- None: this reworks existing screens and an existing lifecycle gate. -->

### Modified Capabilities
- `class-management`: completing an open class no longer requires a ready roster; roster readiness gates finalization instead of completion.
- `live-class-command-screen`: the completed class's state-appropriate primary action becomes review-and-finalize, and the class page no longer finalizes a roster directly.
- `guided-roster-finalization`: the review screen becomes a confirm-and-correct step covering the class details, sessions, instructors, and the full roster, with finalization held back until the roster is ready.

## Impact

- **Actions**: `transitionClassAction` navigates to the review screen after completing; its `redirect()` must sit outside the `try/catch`, since a redirect works by throwing and the current handler would swallow it. `transitionClass` drops its `validateRosterCompletion` call; `finalizeClass` keeps its own.
- **Routes**: the completed-class review route composes the existing class-data forms alongside the roster controls it already renders; the class detail route drops the finalize control for completed classes.
- **Reuse**: `ClassForm`, `ComponentForm`, `AttendanceControls`, `AddAttendanceForms`, and `FinalizationControls` already exist and already permit edits while a class is `completed` (`assertClassEditable` blocks only finalized and cancelled), so no new form or service is required.
- **No schema change** and no migration. Finalization and reopen authorization, immutable snapshots, and reporting behavior are unchanged.
