## Why

Creating a class takes six wizard steps and then still is not open: the wizard creates a **draft**, and staff must return to the class page and press a separate `Open class` action — even though the wizard already collected every field that action validates. Worse, the wizard immediately shows a QR and sign-in link for a class that cannot accept sign-ins yet. The class page then has four different personalities by status, repeats the wizard's fields under "Step 1/2/3/4" headings, and the live roster appears on two different pages. The result is a workflow that needs training to understand.

## What Changes

- **Create and open in one action.** The wizard's final button creates the class already open. No draft state, no second confirmation.
- **Three steps instead of six:** Class (course, delivery, site, date/time, hours, lead instructor, PIN) → Reporting (systems, host agency, required-information preview) → Review, with `Create & open`.
- **Remove the draft lifecycle state.** A class is `open`, `completed`, `finalized`, or `cancelled`.
- **Class setup stays editable while the class is open** (course, site, host agency, reporting systems, sessions, lead instructor), locked once it is completed or finalized.
- **Retire `/staff/classes/<id>/roster`.** The class page shows a read-only roster and manual add; **attendance corrections (credited hours, removal) happen at the finish-attendance step**, on the completed review page.
- **One class page, one primary action per state:** `Open class` is gone; instead `Finish attendance & review` while open, `Finalize roster` when completed, read-only once finalized.
- **Public directory display window.** An open class appears on the landing page only between **18 hours before** its first session and **36 hours after** its first session, so create-and-open does not publish a future class immediately.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `class-creation-wizard`: three steps; the final action creates and opens the class; no draft.
- `class-management`: lifecycle drops `draft`; setup edits are allowed while open and locked at completion/finalization.
- `live-class-command-screen`: the single class page carries the state-driven primary action, the read-only roster, manual add, and the sign-in record link.
- `instructor-roster`: the standalone roster page is retired; credited-hour and removal corrections happen at the finish-attendance step.
- `public-class-directory`: an open class is listed only within its display window around the first session.

## Impact

- **Modules**: `classes/services.ts` (create-and-open, draft removal, list filtering), `classes/constants.ts` (status set/tone), `instructor-roster/services.ts` (edit guards), `public-class-directory` listing.
- **Schema**: `classes.status` check constraint drops `draft`. No production rows use it (20 finalized, 4 open, 1 cancelled), so no data migration is required.
- **Routes/UI**: `classes/new` wizard, `classes/[id]` class page, `classes/[id]/roster` removed, `classes/[id]/review` gains corrections, class list draft handling removed.
- **Security/behavior**: setup edits while open can change reporting systems after sign-ins; existing readiness/confirmation guards surface the resulting invalid attendance rather than silently accepting it.
- **Testing**: unit and browser coverage for create-and-open, the retired roster route, corrections at review, and the directory display window.
