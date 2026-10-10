## 1. Schema and data

- [x] 1.1 Add `requires_mileage` to `mtu_catalog_items`; widen the `kind` check to include `transport`; add the transport branch to `rule_shape`; add a check keeping `requires_mileage` non-null only for transport (`src/server/db/schema/reference.ts`)
- [x] 1.2 Generate the schema migration with `npm run db:generate`
- [x] 1.3 Add a one-off idempotent migration that moves the van to transport (`requires_mileage = true`) and inserts Department vehicle (`true`) and POV (`false`) when absent

## 2. Catalog constants and services

- [x] 2.1 Add `TRANSPORT` to `MTU_CATALOG_KINDS` and update `MTU_CATALOG_SEED` (move the van to transport; add Department vehicle and POV)
- [x] 2.2 Extend the catalog input/normalization to accept transport with `requiresMileage` (equipment and supplies leave it null); keep the supplies rule validation
- [x] 2.3 Include transport in the catalog list/get ordering alongside equipment and supplies

## 3. Admin catalog UI

- [x] 3.1 Add Transport to the entry-form kind select with a "Requires mileage" control shown only for transport
- [x] 3.2 Group the catalog list into Equipment / Supplies / Transport sections and show the mileage requirement on transport rows

## 4. Usage component

- [x] 4.1 Add a select/confirm mode to `MtuUsageFields`: select renders equipment, supplies, and transport checkbox groups only (no quantity inputs, no rule text); confirm renders editable quantities
- [x] 4.2 Render mileage under a collapsed Transport subsection that auto-expands and is required when a requires-mileage transport is selected
- [x] 4.3 Move the off-catalog equipment and supplies fields under a collapsed "Additional details"
- [x] 4.4 Retire the wizard's inline MTU markup in favor of the shared usage component

## 5. Class services

- [x] 5.1 Accept transport selections in class create/update and persist them in `class_mtu_usage_items` as kind transport with no quantity
- [x] 5.2 Enforce the create-only mileage requirement in `createClass` when a requires-mileage transport is selected; do not enforce it in `updateClass`, `finalizeClass`, or `updateClassMtuUsage`
- [x] 5.3 Stop submitting and reading supply quantities from the creation and edit forms (suggestions only until finalization)

## 6. Finalization step

- [x] 6.1 Extend the MTU confirmation step to include transport selections and mileage (editable) alongside the confirm-mode supply quantities
- [x] 6.2 Persist the confirmed transport selections and mileage in `confirmMtuUsageForFinalization`

## 7. Tests and verification

- [x] 7.1 Unit: transport entries carry no quantity rule, and the requires-mileage flag drives the mileage requirement
- [x] 7.2 Integration: creation with a requires-mileage van and no mileage is rejected; POV alone is accepted; edit, finalize, and usage changes do not require mileage
- [x] 7.3 Integration: creation stores selections without supply quantities, and quantities are resolved at finalization
- [ ] 7.4 Run `npm run check` and `npm run verify` and resolve any failures
