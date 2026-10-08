## 1. Mapping and renderer

- [x] 1.1 Add a wrapping flag to the KFS-1A `TemplateMapping` marking the Curriculum, Class Name, and Lesson Plan cells as two-line
- [x] 1.2 In `renderPage`, enable multiline on each flagged field before `updateFieldAppearances`, leaving all other fields single-line

## 2. Tests

- [x] 2.1 Add a renderer test asserting a long Curriculum/Class Name/Lesson Plan value renders across two lines at a larger size than the single-line auto-shrink
- [x] 2.2 Add a renderer test asserting a short value still renders on one line
- [x] 2.3 Confirm the template checksum and deterministic-rendering tests still pass

## 3. Verification

- [x] 3.1 Run `npm run check`, `npm run test`, and `npm run test:integration`
- [ ] 3.2 Visually verify a rendered KFS-1A with a long curriculum label, class name, and lesson plan wraps cleanly within its cells
