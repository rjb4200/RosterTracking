## Context

See `proposal.md` - Why. The constraints that shape the approach:

- The class page (`src/app/staff/(protected)/classes/[id]/page.tsx`) is a server component with `dynamic = "force-dynamic"`. One render runs `getClassDetail`, `getClassRoster`, `listRosterFormOptions`, `resolveClassRequirements`, `getClassPublicAccess`, and generates a QR data URL on the CPU.
- The roster region already renders only when `status === "open"` (`page.tsx:55,111`); `completed`/`finalized` swap in the finalization section instead.
- `getClassRoster` (`src/modules/instructor-roster/services.ts:633`) already enforces assignment/elevation through `requireAssignedInstructor` and accepts `lock = false`, so a read-only poll takes no row locks.
- Neon suspends a compute after 5 idle minutes, and suspended compute is free. Billing is `CU-hours = compute size × hours running`; this project's minimum compute is 0.25 CU. Any request inside the 5-minute window resets it.
- `classComponents.endsAt` is a `NOT NULL` session end (with a `endsAt > startsAt` check), and `max(classComponents.endsAt)` is already the established final-session-end pattern in `listClasses` and `listOperationalClasses`.

## Goals / Non-Goals

**Goals:**
- Show a newly signed-in attendee on the open class page without the operator reloading.
- Refresh only the roster, not the whole page.
- Bound refreshing so an unattended page lets the compute suspend.
- Reuse the existing authorization and roster query rather than duplicating them.

**Non-Goals:**
- Server push (SSE or websockets) or any third-party realtime service.
- Live updating of the class list, dashboards, or the sign-in record page.
- Live display of removed or corrected entries; those stay at the finish-attendance step.
- Changing manual attendance entry, which remains a server action.

## Decisions

**Poll a dedicated read-only endpoint instead of calling `router.refresh()`.**
A page refresh re-runs every query above plus QR generation for one new row. A dedicated route returns only the roster payload. *Alternative considered:* `router.refresh()` — less new code, but re-renders the whole page and repeats the most expensive work on a 10-second cadence.

**Reuse `getClassRoster` with `lock = false`.**
It already returns exactly the rows the page shows and already rejects callers who are not the creator, an assigned instructor, an administrator, or a training major. Passing `false` avoids `FOR UPDATE` on every poll. *Alternative considered:* a leaner purpose-built query — rejected because it would fork the authorization rule that currently lives in one place.

**Refresh every 10 seconds.**
Responsive enough for a classroom sign-in while keeping request volume modest. *Alternative considered:* SSE — lower latency, but it holds a connection (and therefore compute) open, hits serverless execution limits, and needs reconnect handling for a benefit a class roster does not need.

**Three independent stop rules, because each covers a case the others miss.**
- *Status*: refreshing stops when the class is no longer `open`. Authoritative, but only fires when a human marks the class complete.
- *Visibility*: refreshing pauses while the tab is hidden and resumes on return. Covers an operator who switches away, but not a wall-mounted tablet that stays visible.
- *Deadline*: refreshing stops after a server-provided instant. Covers the visible-and-forgotten case.

**Compute the deadline on the server as the latest session end plus a 4-hour grace period.**
The latest session end is the maximum `endsAt` across the class's components, reusing the pattern already used for the class list; the grace period absorbs sessions that run long and late sign-ins. The server sends this instant to the client, so the client does not depend on its own clock or on knowing the schedule. *Alternative considered:* a client-side "stop N hours after page load" cap — simpler, but unrelated to when the class actually ends.

**Append new rows with no flash, highlight, or sound.**
An instructor is watching the list continuously; motion is noise, and any "new row" treatment would need to guess which rows are new.

**Return the class status in the poll payload and 404 on unauthorized or unknown classes.**
The client uses the status to stop refreshing; the 404 mirrors the existing `class-sign-in-record` route so a probe cannot distinguish "not yours" from "does not exist".

## Risks / Trade-offs

- **Polling defeats Neon scale-to-zero and accrues CU-hours.** → The three stop rules bound it to the class window; a page left open overnight stops at the deadline and the compute suspends. Visibility pauses cover the common "switched tabs" case even before the deadline.
- **A session may run past its scheduled end.** → The 4-hour grace absorbs realistic overruns, and the status rule remains authoritative when an operator completes the class on time.
- **Background-tab timer throttling varies by browser, and mobile browsers may freeze the tab.** → The visibility rule makes behavior explicit rather than relying on throttling.
- **A poll can read a roster mid-correction.** → Polling is read-only and takes no locks; corrections continue to run through existing server actions.
- **Two operators could add the same student concurrently.** → Unchanged by this design; manual entry keeps its existing server-side validation.

## Migration Plan

Additive, no schema change and no migration. Deploy the route and the client roster component together; the page's initial server render still supplies the first payload, so there is no empty state on load. Rollback is reverting the commit, with no data implications.
