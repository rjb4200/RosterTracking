## 1. Audit scoping foundations

- [x] 1.1 Add `classId` to the `details` of `student.profile.completed_from_sign_in`, `student.credential.added_from_sign_in`, and `student.membership.added_from_sign_in` in `src/modules/student-sign-in/attendance.ts`
- [x] 1.2 Extract the roster access assertion (`hasElevatedRosterAccess` or assigned-instructor check) into a shared helper and have `src/modules/class-sign-in-record/service.ts` use it

## 2. Class audit log module

- [x] 2.1 Add `src/modules/class-audit-log/service.ts` that assembles class-scoped entries using the union of `entity_type = 'class'`, `details->>'classId'`, and the class's finalization revision ids, joins actor display names, and orders chronologically
- [x] 2.2 Add an action label/category map (setup, sign-in & attendance, finalization, reporting & outputs) with human-readable descriptions from `details` and a fallback for unknown actions
- [x] 2.3 Add `src/modules/class-audit-log/pdf.ts` rendering a grouped, paginated PDF, mirroring `src/modules/class-sign-in-record/pdf.ts` (department time, wrapping, fixed metadata)
- [x] 2.4 Add service tests asserting the union includes class lifecycle, attendance, public sign-in, and revision-output events and excludes other classes' events
- [x] 2.5 Add PDF renderer tests for known-action labels, unknown-action fallback, and page overflow

## 3. Audit log API route

- [x] 3.1 Add `src/app/api/staff/class-audit-log/[classId]/route.ts` following the `class-sign-in-record` route: `requireStaff`, service call, `inline`/`attachment` disposition, `404` on any failure
- [x] 3.2 Add integration/e2e coverage for access (assigned instructor permitted, elevated permitted, unrelated instructor denied) and disposition behavior

## 4. Review screen reorganization

- [x] 4.1 Restructure `src/app/staff/(protected)/classes/[id]/review/page.tsx` into Finalization, Documents, Revision history, Corrections, and Attendance sections
- [x] 4.2 Build the Documents section: sign-in record and class audit log always; KFS-1A, KBEMS-E16, and certificates for the latest finalized revision; a finalization-required message when only completed
- [x] 4.3 Reduce `OfficialRosterControls` to one View plus the email control, and `CompletionCertificateControls` to one View
- [x] 4.4 Reduce the sign-in-record page actions to a single View (inline PDF) and surface its View in the Documents section
- [x] 4.5 Keep older revisions' outputs reachable inside the revision history section

## 5. Verification

- [x] 5.1 Update official-roster and sign-in-record tests for the consolidated View behavior
- [x] 5.2 Run `npm run check` and `npm run test` and `npm run test:integration`
- [ ] 5.3 Manually verify the review screen for a completed-not-finalized class and a finalized class, including each View document
