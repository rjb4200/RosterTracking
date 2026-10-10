## Context

See `proposal.md` - Why. Grounding facts from the current code:

- `mtu_catalog_items` already uses a `kind` discriminator with a check
  `kind in ('equipment','supplies')` and a `rule_shape` check that gives
  supplies a quantity rule and forbids one on equipment
  (`src/server/db/schema/reference.ts`).
- The initial catalog is one code constant, `MTU_CATALOG_SEED`
  (`src/modules/reference/constants.ts`), applied by `reference-seed.ts`
  (`onConflictDoNothing`) and the one-off migration `0032`. It currently lists
  *Ford Transit Van 15 passenger* among the 18 equipment entries.
- The usage UI is one shared component, `mtu-usage-fields.tsx`, used by
  `class-form.tsx`, `mtu-usage-form.tsx`, and `finalization-controls.tsx`; the
  wizard (`class-creation-wizard.tsx`) has a **second, inline controlled copy**
  of the same markup. Both draw a per-supply number input and the rule text.
- `mtu.ts` derives supply quantities from a rule and the roster;
  `services.ts`'s `replaceMtuUsageItems` already treats an absent submitted
  quantity as `source: 'suggested'`, and `resolveMtuUsageItemsForFinalization`
  freezes suggestions at finalization. Mileage is a free-text column on
  `mtu_usage`.
- The admin screen `/staff/mtu-catalog` exists (list/new/record) and its
  permission `mtu-catalog.manage` is seeded by `db:seed`.

## Goals / Non-Goals

**Goals:**
- A third catalog kind, transport, with a per-entry mileage requirement.
- Mileage required only at class creation for a driving transport, editable and
  never locked afterward.
- A cleaner usage step: selection-only at creation, quantities at finalization,
  no rule text, off-catalog items collapsed.

**Non-Goals:**
- No change to how supply quantities are estimated or frozen (already correct).
- No transport quantity or per-vehicle mileage.
- No change to the permission model or the reference-catalog screen pattern.
- No enforcement of mileage on edit, finalization, or post-lock changes.

## Decisions

### D1: Transport is a third `kind` in the same table

Add `transport` to the `kind` check and a nullable `requires_mileage` boolean.
Transport behaves like equipment for the quantity rule (none) and carries the
mileage flag; non-transport entries leave it null.

*Why not a separate table:* identical shape and lifecycle; a discriminator keeps
one management screen, one service set, and one usage join.

*Constraint shape:* the `rule_shape` check gains transport on the "no quantity
rule" side; a second check keeps `requires_mileage` non-null only for transport.

### D2: The mileage requirement is a create-only validation

`createClass` rejects a create when a selected transport has
`requires_mileage` and mileage is empty. `updateClass`, `finalizeClass`, and
`updateClassMtuUsage` do **not** enforce it.

*Why:* the product decision is "required at initial creation only"; a later edit
may blank it. Encoding it in exactly one path keeps the rule honest and avoids
the surprising "can't save" states elsewhere. The asymmetry is intentional and
documented in the spec.

### D3: Creation stops submitting supply quantities

The creation/edit selection sends only item ids for equipment, supplies, and
transport. Supply quantities are not part of the create payload; the server's
existing rule stores an absent quantity as a suggestion, and quantities are
confirmed at finalization.

*Why:* at creation the roster is empty, so the estimate (`per_class +
per_student × 0`) is meaningless to edit. This is a UI change, not a data-model
change — the join table and `source` semantics are unchanged.

### D4: One usage component with a selection/quantity mode

Replace the duplicated markup: `MtuUsageFields` gains a mode. In **select** mode
(creation and edit) it renders checkbox groups for equipment, supplies, and
transport, plus the collapsed mileage field, and no quantity inputs or rule
text. In **confirm** mode (finalization and the review-operational form) it
renders the editable quantities. The wizard's inline copy is retired in favor of
the shared component (made controlled-compatible) so the two screens cannot
drift again.

*Alternative considered:* leave the wizard's inline copy and only tweak it —
rejected; the duplication is why the screens already look different.

### D5: Mileage lives under Transport, collapsed and conditional

The mileage estimate renders inside a collapsed "Transport" subsection. It
auto-expands and becomes required when a `requires_mileage` transport is checked;
when only POV is checked it stays collapsed and optional. Mileage is presented
as an estimate (a numeric field), not a locked fact.

### D6: Off-catalog extras collapse

The free-text "other equipment" and "other supplies" fields move under a
collapsed "Additional details" affordance so the primary selection reads cleanly.

### D7: The van moves via a data migration, not a rewrite

A one-off idempotent migration updates the existing van row's `kind` to
`transport` (setting `requires_mileage = true`) and inserts *Department vehicle*
(`requires_mileage = true`) and *POV* (`requires_mileage = false`) if absent.
`MTU_CATALOG_SEED` is updated to match so a cleared catalog seeds correctly.

## Risks / Trade-offs

- **Existing van row violates new checks during migration** → migrate in order:
  widen checks first, then flip the van's kind and set the flag.
- **`requires_mileage` set on a non-transport entry** → check constraint keeps it
  null for equipment/supplies.
- **Create-only asymmetry surprises staff** → the mileage requirement message is
  specific to creation; later surfaces label mileage as optional.
- **Permission still unseeded in a database** → deploying this change also
  requires `db:seed`; the admin screen stays hidden otherwise.
- **Shared component controlled/uncontrolled complexity** → keep the component
  presentational and let each caller own its state binding.

## Migration Plan

1. `db:generate` migration: add `requires_mileage`, widen the `kind` check, add
   the transport `rule_shape` branch and the `requires_mileage` check.
2. One-off data migration: move the van, insert department vehicle and POV
   (idempotent, no duplicates).
3. Update `MTU_CATALOG_SEED` and the catalog form/list for three kinds.
4. Ship the usage UI/service changes (select vs confirm, collapsed mileage and
   extras).
5. Rollback: the columns and checks are additive; reverting app code leaves the
   transport rows present but unused. Restore the van's kind from the audit/backup
   only if the catalog must be exactly as before.

## Open Questions

- Whether the finalize step's "list every active supply, collapsed remainder"
  behavior should narrow to the selected supplies now that creation is the
  selection surface — deferred; the current spec already allows either and this
  change does not need it.
