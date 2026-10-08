## 1. Lookups

- [x] 1.1 Add `getTrainingCode(db, id)` to `src/modules/reference/services.ts`, mirroring `getAgency`
- [x] 1.2 Add `getCurriculum(db, id)` to `src/modules/reference/services.ts`, mirroring `getAgency`

## 2. Training codes

- [x] 2.1 Move the create form to a new `/staff/training-codes/new` page and return to the list after creating
- [x] 2.2 Add the `/staff/training-codes/[id]` record page with heading, Back, Deactivate/Reactivate, Archive, and the edit form
- [x] 2.3 Simplify the list: drop the Actions column and link the code cell to the record page
- [x] 2.4 Update the training-code actions to revalidate the record path and redirect to the list after archiving

## 3. Curricula

- [x] 3.1 Move the create form to a new `/staff/curricula/new` page and return to the list after creating
- [x] 3.2 Add the `/staff/curricula/[id]` record page with heading, Back, Deactivate/Reactivate, Archive, and the edit form
- [x] 3.3 Simplify the list: drop the Actions column and link the program-title cell to the record page
- [x] 3.4 Update the curriculum actions to revalidate the record path and redirect to the list after archiving

## 4. Agencies and sites

- [x] 4.1 Add `/staff/agencies/new` and `/staff/sites/new` pages, move each create form there, and return to the list after creating
- [x] 4.2 Move the stray bottom-of-file `import Link` to the top in the agencies and sites list pages

## 5. Consistency and verification

- [x] 5.1 Standardize the list tables on the `reference-table` class across the four catalogs
- [x] 5.2 Add integration tests for `getTrainingCode` and `getCurriculum`
- [x] 5.3 Run `npm run check`, `npm run test`, and `npm run test:integration`
