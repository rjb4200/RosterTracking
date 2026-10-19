## 1. Cover header

- [x] 1.1 Add the class's scheduled hours to the cover page header in `renderStudentListCover` (`src/modules/completion-certificates/service.ts`), using the existing `certificateClassHours` so the cover states the same hours as the certificates.
- [x] 1.2 Compose the header meta (date, participant count, class hours) through a small pure helper so the value is unit-testable, and keep the per-participant credited-hours column unchanged.
- [x] 1.3 Confirm the certificate pages, the certificate email, and the individual training notice are untouched and continue to use the class's scheduled hours.

## 2. Tests

- [x] 2.1 Test that the cover header meta includes the class's scheduled hours.
- [x] 2.2 Test a class whose participants are credited hours that differ from the schedule: the header still states the class hours and the participant rows keep their credited hours.

## 3. Verification

- [x] 3.1 Run `npm run check`, `npm run test`, and `npm run build`.
- [x] 3.2 Confirm `openspec validate certificate-cover-class-hours` passes.
