## 1. Data

- [x] 1.1 Add `recentCurriculumIds` to `listClassFormOptions`, computed from the actor's last 10 created or instructed classes (mirroring `recentSiteIds`), reading `class_components.curriculumId` and de-duplicating

## 2. Options and UI

- [x] 2.1 Move `curriculumLabel` into `fire-subjects.ts` and add a `curriculumSearchOptions(curricula, recentCurriculumIds)` helper that puts a "Recently used" group before "All curricula"
- [x] 2.2 Pass `recentCurriculumIds` through the wizard to `FireSubjectRow` and use the helper for its Curriculum options

## 3. Verification

- [x] 3.1 Add unit tests for `curriculumSearchOptions` (recent group first, recent entries also in the full group, no recent ids)
- [x] 3.2 Add an integration test that `recentCurriculumIds` reflects the curricula of the actor's recent classes
- [x] 3.3 Run `npm run check`, `npm run test`, and `npm run test:integration`
