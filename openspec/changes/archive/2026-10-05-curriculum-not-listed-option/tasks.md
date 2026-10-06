## 1. Shared control

- [x] 1.1 Add a `footer` slot and a `pinned` option flag to `SearchSelect` (pinned options are always shown but excluded from filtering and auto-select)
- [x] 1.2 Add a shared `CurriculumSelect` (curriculum options + a "Not listed (type one)" option that reveals a free-text name input; choosing one clears the other)

## 2. Adopt the control

- [x] 2.1 Use `CurriculumSelect` in `fire-subject-fields.tsx` in place of the Curriculum `SearchSelect` and the separate optional input
- [x] 2.2 Use `CurriculumSelect` in `component-form.tsx` in place of the plain Curriculum select and optional input, adding a `recentCurriculumIds` prop
- [x] 2.3 Pass `recentCurriculumIds` to `ComponentForm` from the edit and review pages

## 3. Verification

- [x] 3.1 Update the curriculum e2e for the new control (choosing Not listed reveals the name input; choosing an approved curriculum hides it) and keep the auto-select coverage valid
- [x] 3.2 Run `npm run check`, `npm run test`, and `npm run test:integration`
