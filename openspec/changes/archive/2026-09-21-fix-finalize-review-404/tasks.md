## 1. Review route state handling

- [x] 1.1 Widen the review route gate to accept `completed` and `finalized` while still returning `notFound()` for other statuses
- [x] 1.2 Branch the rendered content on status: editable review for `completed`, read-only finalized view for `finalized`

## 2. Finalized review view

- [x] 2.1 Load finalization history (and official-roster capability) for the finalized view, mirroring the class detail page's finalization section
- [x] 2.2 Omit `AttendanceControls` and `AddAttendanceForms` when the class is finalized and present the locked roster instead
- [x] 2.3 Replace the readiness summary with the locked/finalized state on the finalized view
- [x] 2.4 Render `FinalizationControls` (reopen branch) and `OfficialRosterControls` with revision history on the finalized view

## 3. Reopen navigation

- [x] 3.1 Navigate the operator to the class detail route when reopening succeeds from the review screen, so the editable lifecycle home renders instead of a not-found

## 4. Verification

- [x] 4.1 Add a regression assertion that finalizing from the review route renders the finalized review instead of a 404
- [x] 4.2 Cover the finalized read-only review and reopen-from-review flows in the instructor-roster integration/E2E suite
- [x] 4.3 Run `npm run check` and `npm run test:integration`, then the relevant Playwright specs, to confirm no regressions
