## 1. Service integrity

- [ ] 1.1 In `updateClass` (`src/modules/classes/services.ts`), clear `objectives`, `courseType`, `courseNumber`, and `emsCategoryId` when KBEMS is not selected, and guard the MTU usage replacement so no usage is retained without MTU.
- [ ] 1.2 Add a `removeClassComponent` service that removes a session from an open class, refuses the only remaining session, and writes an audit event.
- [ ] 1.3 Add a `removeClassInstructor` service that removes an assignment from an open class, refuses the last lead, re-checks the Fire instructor guard when Fire is selected, and writes an audit event.
- [ ] 1.4 Expose remove-session and remove-instructor server actions that call the new services and revalidate the class pages.

## 2. Destination-driven edit screen

- [ ] 2.1 Split `ClassForm` into named cards — Class basics, Reporting, EMS course details (KBEMS only), MTU usage (MTU only), Student access — driven by the `reportingSystemIds` state so cards appear and disappear with the selection.
- [ ] 2.2 Keep hidden destination values in component state while their card is hidden, and show an inline note when a destination with data is unticked stating that its details will be cleared on save.
- [ ] 2.3 Make the session editor reveal destination-specific fields: Fire subject fields only while Fire is selected, the Method only while KBEMS is selected, and grouped category options when both are selected.
- [ ] 2.4 Replace the repeated inline session forms with a schedule list of read-only rows (range, hours, title/subject, method), one open editor at a time, an add-session control, a remove-session control, a running credited-hours total, and a same-day overlap indication.
- [ ] 2.5 Rework the instructors card to show explicit lead and assisting roles, a change-lead control, a remove control, the "the lead signs the roster" note, and the fire-qualification note while Fire is selected.
- [ ] 2.6 Add the page frame: a banner stating that edits reach the live sign-in roster and finalization happens on review, anchor navigation with per-card counts, and an at-a-glance summary of status, schedule, total hours, destinations, lead, and PIN state.
- [ ] 2.7 Give each card a consistent action row with a pending label and a transient saved confirmation, and style the cards, summary, and schedule rows in `src/app/globals.css`.
- [ ] 2.8 Scope the initial-certification course-number validation to the KBEMS card and ensure hidden groups never block a save.

## 3. Tests

- [ ] 3.1 Test that EMS and MTU data are cleared or rejected on save when their destination is not selected.
- [ ] 3.2 Test that removing the only session and removing the last lead are refused, and that other removals succeed and are audited.
- [ ] 3.3 Test the destination-driven visibility rules (EMS card, MTU card, Fire session fields, KBEMS method, combined grouping).
- [ ] 3.4 Test the schedule total and the overlap indication.
- [ ] 3.5 Test the instructors card consequences (lead-signs note, Fire qualification note).

## 4. Verification

- [ ] 4.1 Run `npm run check`, `npm run test`, and `npm run build`.
- [ ] 4.2 Run the class-related integration tests (finalization-reporting, fire-roster-fields, reporting-destinations) and resolve any failures.
- [ ] 4.3 Confirm `openspec validate redesign-class-edit-screen` passes.
