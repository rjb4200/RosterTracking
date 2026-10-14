## 1. Book-order helper

- [x] 1.1 Add an exported pure `orderChaptersInBookOrder(rows)` to `src/modules/reference/services.ts` that orders by `position`, `number`, `id`; assigns section order from first appearance; returns sectioned chapters grouped by section order, then unsectioned chapters last
- [x] 1.2 Add a unit test for the helper covering a sectioned book in catalog order, unsectioned chapters last, and a stable tiebreak

## 2. Admin read

- [x] 2.1 Keep `listCurriculumChaptersForAdmin` returning every chapter (active and archived) with a stable base order (`position`, `number`) so the page can order and partition it

## 3. Curriculum record page

- [x] 3.1 Partition the read result into active and archived chapters on `src/app/staff/(protected)/curricula/[id]/page.tsx`
- [x] 3.2 Render active chapters with `orderChaptersInBookOrder` and their existing section grouping, Edit, and Archive actions
- [x] 3.3 Render archived chapters inside a collapsed "Archived chapters (n)" disclosure with a Reactivate action, separate from the active list
- [x] 3.4 Keep the "Add chapter" form and the note about offering chapters to Fire subjects

## 4. Tests and docs

- [x] 4.1 Extend `tests/integration/curriculum-chapters.test.ts` to assert archived chapters are excluded from the active list ordering and that the list is in book order (sections in catalog order, unsectioned last)
- [x] 4.2 Note the hidden-by-default archive behavior wherever the chapter list is documented (the record page note)
- [x] 4.3 Keep the revive-on-re-add integration test (archiving a chapter then re-authoring the same section and number reactivates it) so a previously used number is never blocked
- [x] 4.4 Add a test asserting that archiving a catalog chapter leaves a class and its finalized roster unchanged (the class stores the chapter value; finalization snapshots it)

## 5. Verification

- [x] 5.1 `npm run check`
- [x] 5.2 `npm test` (unit) and `npm run test:integration` (integration skipped: no `TEST_DATABASE_URL` in `.env`)
