## Why

During a class, the roster is the thing an instructor actually watches, but it only updates when the page is reloaded. A student signs in, nothing appears, and the instructor either refreshes by hand or assumes the sign-in failed. The class page should show sign-ins as they happen.

## What Changes

- The class page roster updates on its own while the class is open, so new sign-ins appear without a manual refresh.
- A read-only roster endpoint serves the refresh, so only the roster updates instead of the whole page (re-rendering the page would re-run class detail, requirements, public access, and QR generation).
- New rows appear in place with no flash, highlight, or sound.
- Polling is bounded so it cannot keep the database compute awake indefinitely: it stops when the class leaves `open`, pauses while the browser tab is hidden, and gives up a fixed grace period after the last session is due to end.
- Manual attendance entry, the sign-in record link, and every other part of the class page are unchanged.

## Capabilities

### New Capabilities
<!-- None: the refresh is new behavior on an existing screen, not a new capability. -->

### Modified Capabilities
- `live-class-command-screen`: the embedded roster becomes self-updating while the class is open, under bounded polling, instead of updating only on manual reload.

## Impact

- **Screen**: `src/app/staff/(protected)/classes/[id]/page.tsx` — the roster region becomes a client component fed by the initial server render and refreshed by polling.
- **New route**: `src/app/api/staff/class-roster/[classId]/route.ts`, following the existing `class-sign-in-record` staff route pattern (permission guard, 404 on failure).
- **Reused service**: `getClassRoster` in `src/modules/instructor-roster/services.ts` already enforces assignment/elevation and supports a non-locking read, so no new authorization or query code is required.
- **No schema change** and no migration.
- **Cost**: the class page polls a database-backed endpoint, which prevents Neon scale-to-zero for as long as it runs. The stop rules above bound this to the class window rather than an overnight tab; the reasoning is recorded in `design.md`.
