## 1. Class-runs-long hours

- [x] 1.1 Add the propagation rule to the shared schedule write path so that, while a class is open, raising the class scheduled total credits every active participant whose credited hours equal the previous total with the new total, in one transaction with a per-row audit event (`src/modules/instructor-roster/services.ts`).
- [x] 1.2 Leave participants credited below the previous total untouched, retaining their credited hours and adjustment reason.
- [x] 1.3 Keep the per-participant bound unchanged: credit is still accepted only from zero through the current scheduled total.
- [x] 1.4 Present the class scheduled total on the review attendance card with an affordance to raise it through the session schedule, and reflect the new total in the roster badges and readiness.

## 2. Review screen organization

- [x] 2.1 Rebuild the open-class review as an ordered checklist of cards — Attendance, Reporting & MTU, Sign & finalize — with the finalize action in the last card.
- [x] 2.2 Present the class details, correction, document, and revision-history content as secondary sections collapsed behind summaries, keeping the three workflow cards open.
- [x] 2.3 Omit a section that has no content, including the removed-attendance section when no participant was removed.
- [x] 2.4 Name each roster-readiness issue by the participant it concerns instead of the attendance record identifier.
- [x] 2.5 Keep the finalized state read-only: retain the documents, delivery, notices, and revision-history sections and omit the open-class editing affordances.
- [x] 2.6 Add card and checklist styles to `src/app/globals.css`.

## 3. Single MTU editor

- [x] 3.1 Remove the standalone "MTU usage" section from the review screen and keep the finalize step's MTU confirmation as the only editor.
- [x] 3.2 Retire the standalone MTU form and its action once nothing references them (or leave them unreferenced pending the finalize-step work).

## 4. Tests

- [x] 4.1 Test that raising the scheduled total credits participants who were at the previous total.
- [x] 4.2 Test that a participant adjusted below the previous total keeps their credited hours and reason.
- [x] 4.3 Test that the removed-attendance section is omitted when no participant was removed.
- [x] 4.4 Test that a readiness issue names the participant rather than the attendance identifier.
- [x] 4.5 Test that an MTU class presents the MTU editor once.

## 5. Verification

- [x] 5.1 Run `npm run check`, `npm run test`, and `npm run build`.
- [x] 5.2 Confirm `openspec validate redesign-class-review-screen --strict` passes.
