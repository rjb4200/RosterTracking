## 1. Schema and migration

- [x] 1.1 Add `kind` (text, not null, default `fire`, check in `fire`/`ems`), `category_group` (nullable text), `sort_order` (integer, not null, default 0), and `maps_to_id` (uuid, nullable self-reference, `on delete set null`) to `training_codes`.
- [x] 1.2 Widen the training-code identity to include kind: replace the `(code, source_revision)` unique index with `(kind, code, source_revision)`.
- [x] 1.3 Add `training_classes.ems_category_id` (uuid, nullable, `on delete set null` referencing `training_codes`).
- [x] 1.4 Generate and apply the Drizzle migration; confirm existing rows read back as `kind = 'fire'`.

## 2. Seed data

- [x] 2.1 Add an `EMS_CATEGORY_SEED` constant in `src/modules/reference/constants.ts`: the corrected full-name list, `category_group = 'core'` on the five core categories, alphabetical `sort_order`, TCCC excluded, `CPR - Healthcare Professional` and `Advanced Cardiac Life Support` separate, IS-200 and IS-700.B separate.
- [x] 2.2 Extend `seedReferenceData` to insert the EMS categories idempotently (`onConflictDoNothing` on kind/code/source revision) so re-runs repopulate without overwriting edits.
- [x] 2.3 Seed the Fire↔EMS mappings (Airway, Trauma, Operations, Cardiovascular↔Cardiology, Medical, CPR/AED HCP, ACLS, PALS/PEPP, HazMat A/O/T, ICS/IS) into `maps_to_id`.

## 3. Reference services

- [x] 3.1 Include `kind` in the training-category create/update inputs and persistence; default new records authored without a kind to `fire`.
- [x] 3.2 Scope `listTrainingCodes` (or its replacement) by kind and order by section → `category_group` (core first) → alphabetical label; expose per-kind list helpers for the pickers.
- [x] 3.3 Scope the `import:training-codes` retire-the-rest rule to the imported kind so a Fire import never archives EMS categories.
- [x] 3.4 Return and resolve `maps_to_id` (both directions) for the wizard's prepopulation.
- [x] 3.5 Update the revive/reactivate lookups to match identity including kind.

## 4. Training-category administration UI

- [x] 4.1 Relabel the catalog screen and navigation entry to "Training categories".
- [x] 4.2 Render the catalog list as a Fire section followed by an EMS section, each alphabetically ordered, with the EMS core group set above a separator.
- [x] 4.3 Add a Fire/EMS kind selector to the new-record and record forms; show it on the record and store it.
- [x] 4.4 Confirm add/edit/deactivate/reactivate/archive work for EMS categories exactly as for Fire codes; keep the empty-vs-no-match states.

## 5. Class-creation wizard

- [x] 5.1 Filter the Fire step's Category picker to `kind = 'fire'`.
- [x] 5.2 Add a required EMS Category search-select to the KBEMS step, offering only `kind = 'ems'` categories with the core group above the separator.
- [x] 5.3 On EMS Category selection, pre-fill the EMS course name (editable) and retain the category as the class's structured category.
- [x] 5.4 On a dual Fire + KBEMS class, pre-fill the EMS Category from the first Fire subject's mapped category without overwriting a manual choice.
- [x] 5.5 Add the `emsCategoryId` hidden field and thread it through the create action and validation (`wizard-validation.ts` requires the EMS Category).
- [x] 5.6 Persist `ems_category_id` on the class in `createClass` and reflect it in the review step.

## 6. Class detail and components

- [x] 6.1 Filter the class-detail component Category picker by the owning class's kind.
- [x] 6.2 Show the class's EMS category on the class detail page where EMS course details are shown.

## 7. Verification

- [x] 7.1 Integration tests: seed idempotency, per-kind listing/order, mapping resolution, retire-the-rest scoped by kind, `ems_category_id` persistence.
- [x] 7.2 Integration tests: revive/reactivate matches identity including kind; duplicate code across kinds does not collide.
- [x] 7.3 e2e tests: training-category screen shows Fire then EMS sections; new-record kind selector; Fire picker excludes EMS and vice-versa; EMS Category fills the course name; dual-class prepopulation.
- [x] 7.4 Update existing e2e fixtures that insert training codes to supply the new `kind` column.
- [x] 7.5 Run lint, typecheck, and the full test suite.
