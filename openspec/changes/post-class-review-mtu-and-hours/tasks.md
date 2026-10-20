## 1. MTU review list

- [x] 1.1 Give the workspace area an always-visible review region so the MTU area can show content while its editor is closed, and use it for the MTU area in place of a one-line summary.
- [x] 1.2 Render the recorded usage grouped by Equipment, Supplies, Transport, and Other, in full without truncation, including transport mileage and free-text extras; state that nothing is recorded when the usage is empty.
- [x] 1.3 Mark each supply as estimated when it follows the roster estimate, and as set when an operator supplied the quantity, showing the roster estimate when it differs.
- [x] 1.4 Make choosing Edit replace the review list with the editor, and keep the MTU area absent for a class that does not report to the Mobile Training Unit.

## 2. Advisory readiness warnings

- [x] 2.1 Count the supplies that still follow the roster estimate and present a non-blocking advisory beside the readiness state, with a control that opens the MTU usage area.
- [x] 2.2 Keep the finalize action available when only advisories remain.

## 3. Roster and hours

- [x] 3.1 Drop the roster's Status column and mark a participant who needs attention inline, keeping the existing row tint.
- [x] 3.2 Add an hours formatter and present credited hours in hours and minutes in the roster (`3h 30m / 4h`), the class summary, the schedule summary, and the session rows.
- [x] 3.3 Replace the decimal credit input with hours and minutes selects in 15-minute increments, bounded by the class scheduled total; keep enforcement interface-only.

## 4. Tests

- [x] 4.1 Test the MTU review list: full grouped list, estimated and set markers, and no MTU area for a non-MTU class.
- [x] 4.2 Test the advisory: shown for estimated supplies, opens the MTU area, and does not withhold finalization.
- [x] 4.3 Test the roster columns, the inline attention marker, and the hours-and-minutes formatting.
- [x] 4.4 Test credit entry in 15-minute increments bounded by the scheduled total.

## 5. Verification

- [x] 5.1 Run `npm run check`, `npm run test`, and `npm run build`.
- [x] 5.2 Run the review-screen browser spec and the class-related integration tests.
- [x] 5.3 Confirm `openspec validate post-class-review-mtu-and-hours --strict` passes.
