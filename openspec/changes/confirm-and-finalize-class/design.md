## Context

See `proposal.md` - Why. The constraints that shape the approach:

- `assertClassEditable` rejects only `finalized` and `cancelled` (`policy.ts:81`), and it gates all three class-data writes: `updateClass` (`services.ts:406`), `saveClassComponent` (`466`), `assignClassInstructor` (`528`). A `completed` class is therefore already editable.
- The edit route already renders for a `completed` class — it redirects only for `finalized`/`cancelled` (`edit/page.tsx:43`) — and already composes `ClassForm`, `ComponentForm`, and the lead-instructor form.
- The review route currently admits only `completed`/`finalized` and already renders `AttendanceControls` and `AddAttendanceForms`.
- `transitionClass` calls `validateRosterCompletion` when the target is `completed` (`services.ts:573-575`); `finalizeClass` calls it as well (`finalization.ts:249`).
- `redirect()` works by throwing, and `transitionClassAction` wraps its whole body in `try/catch` (`actions.ts:228-246`). `reopenClassAction` was already restructured to raise its redirect *outside* the catch (`actions.ts:300-317`).
- `getScheduledClassHours` sums component credited hours and throws when the total is not positive; `resolveClassRequirements` derives requirement sets from the class's reporting systems, while attendance rows carry the contexts snapshotted at sign-in.

## Goals / Non-Goals

**Goals:**
- One door to finalization, and it is the screen that carries the editing tools.
- Let an operator reach the correcting screen even when the roster is not yet clean.
- Reuse the existing edit forms and services rather than introduce a parallel path.

**Non-Goals:**
- Changing finalization, reopen, snapshot, or reporting behavior.
- Changing *what* may be edited — only where the editing happens.
- Redesigning the review screen beyond composing the existing forms on it.
- Making a class with no active attendance finalizable.

## Decisions

**Move the readiness gate from completion to finalization.**
Completion becomes a plain state change; readiness is enforced once, at the irreversible step. `finalizeClass` already enforces it, so no new validation is written and no safety is lost. *Alternative considered:* keep the gate and render the review screen for `open` classes — rejected because the screen is defined as the completed-class review and would then have to own the completion transition too, and because `completed` is already the designated correction state (`requireMutableRosterClass` calls it "under completed review").

**Redirect after completing, with `redirect()` raised outside the `try/catch`.**
`transitionClassAction` serves both complete and cancel, so the redirect is conditional on the target status. Raising it inside the catch would convert it into an error message, so it follows the shape `reopenClassAction` already uses. *Alternative considered:* navigate on the client after the action resolves — rejected because it splits navigation from the state change and duplicates the decision in the component.

**Compose the existing edit forms on the review screen rather than build a combined form.**
`ClassForm`, `ComponentForm`, and the instructor form already accept a `completed` class, so they are reused unchanged. This keeps one implementation of each field's validation and one source of truth for the option lists. *Alternative considered:* a purpose-built single form — rejected because it would duplicate validation that already lives in the services.

**Keep `/edit` for open classes; do not merge the routes.**
The two screens have different entry points and different jobs. Sharing the form components gives the reuse benefit without disturbing the open-class flow. *Alternative considered:* retire `/edit` and always edit on the review screen — rejected as unnecessary movement of the open-class flow.

**Withhold the finalize action in the UI while issues remain, keeping the server check authoritative.**
The review screen already lists readiness issues; the button becomes unavailable until that list is empty. The server enforcement stays, because the UI is advisory. *Alternative considered:* leave the button enabled and surface the server error — rejected because an operator should see the block before attempting an irreversible action.

**Drop the finalize control from the class page's completed state.**
The class page's completed state becomes a pointer to the review step, removing the second door that let operators finalize without reviewing.

**Collapse the class-data forms on the review screen by default.**
The review screen's default view stays the readiness list and the roster, so the screen still reads as a confirm step; class details, sessions, and instructors sit in a collapsed section that expands when correcting. *Alternative considered:* render every form expanded — rejected because it buries the roster and the issues, which are the reasons the operator opened the screen.

## Risks / Trade-offs

- **A class can now rest in `completed` with a broken roster.** → That is the correction state; finalization stays impossible until the roster is ready and the review screen names what is wrong, and the class list already treats completed classes as current work.
- **Editing a session at the review step can push an existing credited value above the new scheduled total.** → Readiness recomputes on the same screen, and the credit controls needed to fix it are on that screen.
- **Changing reporting systems can invalidate the attendance context snapshotted at sign-in, and contexts cannot be back-filled.** → The affected records are named as issues, and resolving them means removing and re-adding the attendance, which the same screen supports. The reporting-systems field should carry a warning.
- **A class with no active attendance still cannot be finalized.** → Unchanged here; completion is now permitted, so such a class rests in review rather than blocking at completion. Tracked as an open question.
- **A redirect inside a server action is easy to break with a catch.** → Mirror the `reopenClassAction` shape and cover completion-navigates-to-review with a test.

## Migration Plan

Additive at the data layer: no schema change and no migration. Deploy the action, service, and screen changes together. Rollback reverts the commit; classes already sitting in `completed` remain valid in both directions because the state set itself is unchanged.

## Open Questions

- Whether a class where nobody signed in should be finalizable, and if so whether that belongs in roster readiness or in a separate dismissal action. Orthogonal to this change; it does not affect the specs, the approach, or the task breakdown.
