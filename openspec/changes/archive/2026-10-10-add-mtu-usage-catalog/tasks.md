## 1. Data model and migration

- [x] 1.1 Add `mtu_catalog_items` (kind, name, quantity-rule columns, isActive, archivedAt, sortOrder, unique `(kind, lower(name))`) to `src/server/db/schema/reference.ts`
- [x] 1.2 Add `class_mtu_usage_items` (classId, itemId, quantity, source; PK `(classId, itemId)`; `restrict` on item) to `src/server/db/schema/classes.ts`
- [x] 1.3 Generate the schema migration with `npm run db:generate`
- [x] 1.4 Add a guarded one-off migration that inserts the 18 equipment and 7 supplies entries only when `mtu_catalog_items` is empty, and have `reference-seed.ts` insert the same `MTU_CATALOG_SEED` list with `onConflictDoNothing` so test/e2e resets repopulate it without overwriting edits

## 2. MTU catalog domain and services

- [x] 2.1 Add `MTU_CATALOG_KINDS` and `MTU_ROUNDING_MODES` constants and the initial entry list as a code constant consumed by the seed migration
- [x] 2.2 Implement catalog services in `src/modules/reference/services.ts` (list with search over active+inactive, get, create, update, deactivate/reactivate/archive) with audit events, mirroring the sites services
- [x] 2.3 Validate the quantity rule (equipment carries none; supplies require unit, rounding, and non-negative quantities; only `other`-style rules are rejected)

## 3. Permission and seed

- [x] 3.1 Add `MTU_CATALOG_MANAGE = "mtu-catalog.manage"` to `src/modules/staff-auth/permissions.ts`
- [x] 3.2 Seed the permission and grant it to `administrator` and `training-major` in `src/server/db/seed.ts`

## 4. Catalog management UI

- [x] 4.1 Add `/staff/mtu-catalog` list page with search and equipment/supplies grouping, gated by `requirePagePermission(MTU_CATALOG_MANAGE)`
- [x] 4.2 Add `/staff/mtu-catalog/new` page and form (name, kind, and supplies-only unit/base/rate/rounding)
- [x] 4.3 Add `/staff/mtu-catalog/[id]` record page with edit form and state actions, plus server actions
- [x] 4.4 Add MTU catalog management to staff navigation for permitted roles

## 5. Consumption rule and estimation

- [x] 5.1 Add the estimation function and structured-usage types to `src/modules/classes/mtu.ts` (`quantity = per_class + per_student × active`, then rounding)
- [x] 5.2 Unit tests for the estimator: per-class, per-student, per-pair fraction, exact fractional unit, ceil, and missing rule

## 6. Structured class usage

- [x] 6.1 Extend class create/update in `src/modules/classes/services.ts` to accept selected item ids and quantities and persist `class_mtu_usage_items` (replace-all) alongside the free-text extras
- [x] 6.2 Implement suggestion resolution: recompute `source='suggested'` rows from the active roster on read, and persist them as `manual` at finalization
- [x] 6.3 Update class/review projections to return structured usage with item names, joining inactive and archived items so retired entries still render

## 7. Usage UI

- [x] 7.1 Update class setup (`class-form.tsx`, `class-creation-wizard.tsx`) to offer equipment on/off, supply selection with suggested quantities, and the free-text extras
- [x] 7.2 Update the review operational usage section (`mtu-usage-form.tsx`) to edit the structured usage while open and after finalization

## 8. Finalization gate

- [x] 8.1 Add the MTU confirmation step to the finalize flow for MTU classes, presented before certify-and-sign and withholding signing until confirmed
- [x] 8.2 Require the confirmation in `finalizeClass` for MTU classes and upsert the operational usage in the same transaction, leaving participant count and revision number unchanged
- [x] 8.3 Stop writing `mtuUsage` into the finalization snapshot in `src/modules/official-roster-pdfs/service.ts`, keeping the field optional so older revisions still decode

## 9. Tests and verification

- [x] 9.1 Integration: catalog create/edit/retire lifecycle, revival on re-add, and permission denial without `mtu-catalog.manage`
- [x] 9.2 Integration: structured usage recording, off-catalog free-text extras, and post-finalization edit on a locked roster leaving revision number and participant count unchanged
- [x] 9.3 Integration: the MTU finalize gate requires confirmation, and a non-MTU class skips the step
- [x] 9.4 Run `npm run check` and `npm run verify` and resolve any failures
