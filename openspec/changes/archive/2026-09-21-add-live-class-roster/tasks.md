## 1. Roster refresh endpoint

- [x] 1.1 Add `src/app/api/staff/class-roster/[classId]/route.ts` following the `class-sign-in-record` route pattern: resolve the staff actor, call the service, return 404 on any failure
- [x] 1.2 Return the roster payload the class page renders: `active` rows (`id`, `name`, `agencyName`, `signedInAt`, `creditedHours`) plus `scheduledHours` and the class `status`, reusing `getClassRoster` with `lock = false`
- [x] 1.3 Ensure the response is never cached, so each poll reflects current attendance
- [x] 1.4 Add a `ROSTER_REFRESH_GRACE_HOURS` constant (4) in the classes module and compute the refresh deadline as the latest `endsAt` across the class's components plus the grace period; return it with the payload
- [x] 1.5 Handle a class with no components by omitting the deadline rather than failing the request

## 2. Live roster on the class page

- [x] 2.1 Extract the roster list and signed-in count into a client component that receives the initial server-rendered payload, the class id, the deadline, and the initial status
- [x] 2.2 Poll the endpoint every 10 seconds and replace the rendered rows in place, appending new attendees with no flash, highlight, or sound
- [x] 2.3 Stop polling when the returned status is no longer `open`, and refresh the page so the state-appropriate section replaces the roster
- [x] 2.4 Pause polling while `document.visibilityState` is `hidden` and resume on becoming visible
- [x] 2.5 Stop polling once the server-provided deadline has passed, even if the class is still open
- [x] 2.6 Clear the interval and the visibility listener on unmount

## 3. Page wiring

- [x] 3.1 Pass the deadline, initial status, and initial roster payload from `page.tsx` into the client roster component
- [x] 3.2 Confirm manual attendance entry, the sign-in record link, the QR panel, and the lifecycle controls are unchanged

## 4. Verification

- [x] 4.1 Unit-test the deadline computation, including multiple components and no components
- [x] 4.2 Integration-test the endpoint: an assigned instructor receives the roster, an unassigned staff member receives 404, and a non-open class stops being served as open
- [x] 4.3 Add an E2E case asserting a new sign-in appears in the roster and the count increases without a page reload
- [x] 4.4 Add an E2E or component case asserting polling pauses while the tab is hidden and stops after the deadline
- [x] 4.5 Run `npm run check`, `npm run test`, the integration suite, and `npm run build`
