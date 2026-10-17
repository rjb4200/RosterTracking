## Context

`training_codes` is currently a single flat catalog of Kentucky Fire Commission codes (seeded from `scripts/data/training-codes.json`, `sourceRevision = 2024-01`). A training code *is* the Fire class "Category": the wizard's Fire step binds it (`fire-subject-fields.tsx`), it is stored on `class_components.training_code_id`, and it flows to finalization (`category: trainingCodes.code`), the KFS-1A roster, and individual training notices.

EMS ("KBEMS") classes have no equivalent. The wizard's KBEMS step collects a free-text EMS course name, course type, course number, and objectives onto `training_classes` (`name`, `course_type`, `course_number`, `objectives`). Free-text course names make EMS reporting and state audits unreliable.

Two catalogs already establish project patterns we reuse: the training-code/curricula administration pattern (`reference-catalog-management`, `reference-data-lifecycle`) and a seeded reference list with `sort_order` (`MTU_CATALOG_SEED`).

## Goals / Non-Goals

**Goals:**
- One catalog of **training categories** with a `kind` of `fire` or `ems`, both maintained from one screen.
- A direct, idempotent seed of the corrected EMS category list, alphabetically ordered, with the five core categories seeded pinned above a separator; staff can pin or unpin any category, of either kind, and map a category to its counterpart.
- Kind-scoped pickers: Fire selection sees only Fire categories; EMS selection sees only EMS categories.
- A required EMS Category on the KBEMS step that fills the editable EMS Course Name and persists a structured reference for reporting.
- A symmetric Fire↔EMS mapping so a dual Fire + KBEMS class pre-fills the EMS Category from the Fire subject.

**Non-Goals:**
- Renaming the `training_codes` table or the `/staff/training-codes` route.
- Changing report/roster/notice rendering to use the new EMS category (the structured value is made available; rendering is a follow-up).
- Any reorder-by-drag administration UI for `sort_order`.
- Migrating existing free-text EMS course names into categories.

## Decisions

### 1. Extend `training_codes`; do not create a new table
A training code already *is* the class Category, referenced by `class_components`, finalization, notices, roster PDFs, and reports. A parallel table would fork that concept and force every reader to branch.
- Add `kind` (`text`, not null, default `'fire'`, check in `('fire','ems')`), `is_pinned` (boolean, not null, default false), `sort_order` (integer, not null, default 0), and `maps_to_id` (uuid, nullable, self-reference `on delete set null`).
- Existing rows need no data migration beyond the column default.
- **Alternative rejected:** a separate `ems_categories` table — duplicates lifecycle/management rules and splits the Category picker logic.

### 2. Kind drives the page sections and the pickers
The `/staff/training-codes` list renders a **Fire** section first and an **EMS** section second, each queried by `kind`. The Fire step's Category search-select filters `kind = 'fire'`; the KBEMS step's Category filters `kind = 'ems'`. The class-detail component Category picker filters by its owning class's kind.
- **Label:** the screen and navigation read "Training categories"; the route and table name stay.

### 3. Ordering: pinned first, then alphabetical; pinning is staff-controlled
Staff mark a category **pinned** from its record form (any kind). Pinned categories are listed first in their section and offered in their own `<optgroup>` above a separator, matching the existing `SearchSelect` group rendering; the remainder follow alphabetically. The admin list draws no separator row — pinned items simply lead.
- Query order: section (`kind`) → `is_pinned` (true first) → `lower(title)`.
- `sort_order` is retained as the alphabetical index for a future manual reorder; today order comes from `is_pinned` then `lower(title)`.
- **Consequence:** the Fire section changes from code order to alphabetical-by-title; confirmed acceptable.

### 4. Cross-kind mapping is a symmetric self-reference
`maps_to_id` links a Fire category to its matching EMS category. Staff set or clear it from the category record form; the service keeps the pair symmetric — setting one side sets the other, and re-mapping or clearing removes the previous counterpart's pointer. The wizard resolves the link in both directions, so either selection can pre-fill the other. A pair is 1↔1; a value with no match leaves `maps_to_id` null.
- **Alternative rejected:** a join table — 1↔1 does not need it.
- Known matches seeded: `P0008 Airway↔Airway`, `P0011 Trauma↔Trauma`, `P0014 Operations↔Operations`, `P0023 Cardiovascular↔Cardiology`, `P0010 Medical Emergencies↔Medical`, `P0001 CPR/AED HCP↔CPR - Healthcare Professional`, `P0015 ACLS↔Advanced Cardiac Life Support`, `P0017 PALS/PEPP↔Pediatric Advanced Life Support`, `T0001–T0003 HazMat Awareness/Operations/Technician↔…`, `FF0001–FF0008 ICS/IS↔ICS/IS entries`.

### 5. EMS Category persists as a structured reference next to the editable name
Add `training_classes.ems_category_id` (uuid, nullable, `on delete set null`). Selecting a category sets the free-text EMS course name (still editable) **and** records the category id. Reports/audits later group on the id, not the text. This mirrors Fire, where the category is structured and the class name is derived-but-editable.
- **Alternative rejected:** storing only the text — defeats the reporting goal.

### 6. Prepopulation keys off the first Fire subject
For a dual Fire + KBEMS class, the EMS Category pre-fills from `subjects[0]`'s mapped category, matching how the course-number pre-fill already uses the first Fire subject. Manual selections are never overwritten by later Fire edits.

### 7. Seeds are direct and idempotent
Ship the EMS list as a TypeScript constant (like `MTU_CATALOG_SEED`) plus a seed step, inserted with `onConflictDoNothing` on identity so re-running repopulates a cleared catalog without overwriting staff edits. The `import:training-codes` retire-the-rest rule is scoped to `kind`, so importing the Fire list does not archive EMS categories.
- **Alternative rejected:** a one-off SQL migration — a constant keeps the canonical list in code and reviewable.

## Risks / Trade-offs

- **Fire list reorders from code to alphabetical** → visible change to an established screen; call out in release notes. Mitigation: `sort_order` remains editable in data if an order must be restored.
- **EMS identity via full-name `code`** → two categories may share a similar title (IS-200 vs IS-700.B). `code`/`title` differ per row, so the `(code, source_revision)` unique index holds; the picker shows the title alone for EMS.
- **Duplicate-looking Fire/EMS names** (e.g. `Trauma`) → acceptable; they are distinct rows joined by mapping, and pickers are kind-scoped so they never co-appear.
- **Reports still free-text until follow-up** → the immediate win is structured capture; without a follow-up rendering change the audit benefit is deferred. Mitigation: explicit follow-up task and Impact note.
- **Mapping maintenance** → new matching values need a link set manually in the admin; unlinked pairs simply do not pre-fill.
- **`is_pinned` applies to both kinds** → Fire rows use it too; a pinned Fire code sits above the Fire separator.

## Migration Plan

1. Add the four `training_codes` columns and the `training_classes.ems_category_id` column (all null/default-safe; existing rows backfill to `kind='fire'`).
2. Add and run the EMS category seed (idempotent) and the Fire↔EMS mappings.
3. Deploy the split pickers, sections, and KBEMS Category step behind the same release.
4. **Rollback:** the new columns are additive and nullable; reverting the UI leaves the columns and seeded rows inert.

## Open Questions

- Should report/roster/notice rendering consume `ems_category_id` in this change or a follow-up? (Currently scoped as a follow-up.)
- Should the FD section also be seeded from a canonical constant rather than only the import script?
