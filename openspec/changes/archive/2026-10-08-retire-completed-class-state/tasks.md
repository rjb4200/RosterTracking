## 1. Domain model and data

- [x] 1.1 Remove `COMPLETED` from `CLASS_STATUSES` and its tone case in `src/modules/classes/constants.ts`
- [x] 1.2 Update `validateClassTransition` so the only transitions are `open → cancelled` (finalization is handled by `finalizeClass`) and update `validateFinalizationTransition` to accept `open`
- [x] 1.3 Update `assertClassEditable` and any status checks that referenced `completed`
- [x] 1.4 Add a migration that resolves existing `completed` rows (move to `open`) and drops `'completed'` from the `classes_status` check; retire `completed_at`
- [x] 1.5 Remove `completed_at` usage in `transitionClass` and anywhere the column is read/written (retain the legacy snapshot date key for existing PDF consumers)

## 2. Finalization from open

- [x] 2.1 Change `finalizeClass` (`src/modules/classes/finalization.ts`) to require an `open` class, revalidate readiness, create the revision, set `finalized`, and close public sign-in in the same transaction
- [x] 2.2 Update `transitionClassAction` and `LifecycleControls` so the only open-class closing action is the finalize flow; remove the `completed` transition and its redirect
- [x] 2.3 Confirm `reopenFinalizedClass` still returns the class to `open` and no path recreates `completed`

## 3. Review screen dual role and class summary

- [x] 3.1 Extract the class details field list from `classes/[id]/page.tsx` into a shared `ClassSummary` component
- [x] 3.2 Render `ClassSummary` (read-only) near the top of `classes/[id]/review/page.tsx` for open and finalized classes
- [x] 3.3 Retarget the review route gate from `completed || finalized` to `open || finalized` and remove the `isCompleted` branch
- [x] 3.4 Keep corrections (class details, sessions, instructors, credit adjustment, removal) available while open; remove the manual attendance correction section
- [x] 3.5 Change the finalized "Back to class" action to a "Back to classes" action
- [x] 3.6 Ensure the finalized record remains read-only and keeps the reopen section at the bottom for eligible operators

## 4. Class list and routing

- [x] 4.1 In `classes/page.tsx`, link finalized rows to `/staff/classes/[id]/review` and keep open rows on `/staff/classes/[id]`
- [x] 4.2 Remove the Completed option and label from the status filter; adjust the Active/Finalized section split
- [x] 4.3 In `listClasses`, remove `completed` from the default scope and `workInFlight`
- [x] 4.4 Update `getOperationalClassAction` and `isOverdueRoster` for the reduced state set

## 5. Remove manual attendance entry

- [x] 5.1 Delete `AddAttendanceForms` and its usages in `classes/[id]/page.tsx` and `classes/[id]/review/page.tsx`
- [x] 5.2 Remove the `regular` and `guest` operations from `roster-actions.ts`
- [x] 5.3 Remove `addManualRegularAttendance` and `addManualGuestAttendance` from `src/modules/instructor-roster/services.ts` and any now-unused option lists

## 6. MTU as live operational data

- [x] 6.1 Allow MTU usage edits on a finalized class without reopening (dedicated update path or exempting MTU from the class-edit lock)
- [x] 6.2 Stop blocking MTU edits via `assertClassEditable` for the MTU-only path
- [x] 6.3 Display and edit live MTU data on the review page; verify MTU updates do not change official roster PDFs or unlock signed class facts
- [x] 6.4 Stop copying MTU into new finalization snapshots and retain existing snapshots unchanged

## 7. Tests and verification

- [x] 7.1 Update `policy.test.ts` and `operational-dashboard.test.ts` for the reduced states
- [x] 7.2 Update `class-audit-log/pdf.test.ts` fixtures to drop `completed` events
- [x] 7.3 Update integration tests that create or assert `completed` classes (finalization, instructor-roster, class-sign-in-record, mtu, live-roster-refresh)
- [x] 7.4 Update e2e specs: `confirm-and-finalize`, `instructor-roster`, `class-list-filters` (row links), `finalization-reporting`, `live-roster`, and any manual-attendance coverage
- [x] 7.5 Run lint, typecheck, unit, and integration suites; then run the affected Playwright specs
