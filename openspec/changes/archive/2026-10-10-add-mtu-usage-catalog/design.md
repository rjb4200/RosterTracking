## Context

See `proposal.md` - Why. Grounding facts from the current code:

- MTU is already a first-class concept. `reporting_systems` seeds a `mtu` row
  (`reference-seed.ts:57`) and `mtu_usage` is a 1:1 table per class with free-text
  `equipment_used`, `mileage`, and `used_supplies` (`schema/classes.ts:206`).
- `mtu.ts` normalizes that free text ("free text for now", `mtu.ts:24`); usage is
  written by class create/update (`services.ts:353-377`) and by
  `updateClassMtuUsage` (`services.ts:379`), which uses `requireClassAccess`
  only, so it already bypasses the finalization lock.
- `updateClassMtuUsage` is exposed on the review page's operational MTU section
  (`review/page.tsx:537-547`) and in class setup (`class-form.tsx:176-194`,
  `class-creation-wizard.tsx:501`).
- Finalization is one transaction: `finalizeClass` (`finalization.ts:359`)
  validates the lead instructor and roster readiness, writes an immutable
  revision, and flips status to `finalized`. Usage is mirrored into the snapshot
  as optional text (`official-roster-pdfs/service.ts:78`).
- The house pattern for an admin-managed catalog is sites / training-codes /
  curricula: a searchable list, a new page, a record page, `isActive` +
  `archivedAt`, and a `*.manage` permission (`reference/services.ts`,
  `app/staff/(protected)/sites/`). Seeded lookup vocabularies (credential types,
  reporting systems) are the *other* pattern and are code-seeded with no screen.
- Permissions and role grants are seeded by `db/seed.ts` (not by a migration),
  keyed idempotently (`seed.ts:108-153`).

## Goals / Non-Goals

**Goals:**
- A department-owned catalog of MTU equipment and supplies with a retire
  lifecycle and an admin management screen.
- Consumption estimated from class size via a per-item rule, shown as a
  suggestion the operator can override.
- A hard MTU confirmation step in finalization, and continued post-finalization
  editability, without touching signed revision facts.

**Non-Goals:**
- No inventory levels, depletion, restocking, or procurement.
- No quantity on equipment (on/off only).
- No per-class override of the consumption *rule* (only the resulting quantity).
- No maintenance / warranty / service-plan records (explicitly removed from the
  source list).
- No backfill of existing free-text MTU usage.
- No change to any other reporting system's behavior.

## Decisions

### D1: One catalog table with a `kind` discriminator

```
mtu_catalog_items
  id              uuid pk
  kind            text not null   check in ('equipment','supplies')
  name            text not null
  unit_label      text            -- supplies only
  per_class_qty   numeric(10,2)   -- supplies only
  per_student_qty numeric(10,2)   -- supplies only
  rounding        text            -- 'ceil' | 'exact', supplies only
  is_active       bool not null default true
  archived_at     timestamptz
  sort_order      int not null default 0
  ...timestamps
  unique (kind, lower(name))
```

*Why one table over sibling tables:* equipment and supplies are structurally
identical here — the only difference is that supplies carry a quantity rule. A
`kind` discriminator gives one management screen with two tabs, one set of
services, and one join, instead of duplicating routes and services.

*Alternative considered:* `mtu_equipment_items` + `mtu_supply_items`. Rejected:
more code for no behavioral gain; the fields are a superset, not a difference.

*Note:* the unique index on `lower(name)` uses the same identity-by-name
convention as agencies/sites, so retirement and revival behave consistently.

### D2: Consumption rule is base + slope + rounding + unit

`quantity = per_class_qty + per_student_qty × active_participants`, then
`rounding` (`ceil` for whole units, `exact` for measurable units like gallons).
A pure per-class item sets `per_student_qty = 0`; a pure per-student item sets
`per_class_qty = 0`.

*Why base + slope over a fixed list of basis types:* one pair of numbers covers
per-class, per-student, per-pair (`per_student_qty = 0.5`), and combinations,
without a menu that would need extending. `rounding` exists because blood is
fractional while gauze, seals, and IFAKs are whole.

*Alternative considered:* an enum `basis` (`per_class | per_student | per_pair`)
plus a rate. Rejected: it cannot express a base plus increment, and "per pair" is
just a fractional per-student rate.

### D3: Structured usage lives in a join table; the text columns become extras

```
class_mtu_usage_items
  class_id  uuid ─┐ PK
  item_id   uuid ─┘ → mtu_catalog_items.id (restrict)
  quantity  numeric(10,2)   -- null for equipment
  source    text            -- 'suggested' | 'manual'
```

`mtu_usage` keeps `equipment_used`, `used_supplies`, and `mileage` as the
free-text extras. Equipment rows have a null quantity (on/off). Reads join active
*and* inactive items so a retired item still renders on a class that used it.

*Why keep the text columns:* the product requirement is that typed extras sit
alongside catalog picks; the columns already exist (`schema/classes.ts:210`), so
this reuses rather than adds storage.

### D4: A suggestion is stored, and recomputed until finalized

`source = 'suggested'` rows are recomputed from the current roster on read while
the class is open; editing a quantity sets `source = 'manual'` and stops
recomputation. At finalization, suggested rows are resolved to their values and
persisted as `manual` so nothing recomputes on a locked roster. This satisfies
"recompute until finalization, stop after" without a scheduled job.

*Why store the suggestion rather than compute on render only:* the class must be
able to hold a value even before any operator opens the step, and the finalize
gate needs a concrete set of rows to confirm.

### D5: Finalization gains a hard MTU step; usage stays out of the signed revision

For a class whose destinations include MTU, the finalize flow is two steps: the
lead instructor first confirms or edits usage (submitted as part of the finalize
request), then certifies and signs. `finalizeClass` (`finalization.ts:359`)
rejects an MTU class finalization that does not carry the confirmation, and
upserts the operational usage in the same transaction. The participant count and
revision number are computed exactly as today and are independent of usage.

Usage SHALL NOT be written into the signed snapshot: stop populating
`FinalizationSnapshot.mtuUsage` (`official-roster-pdfs/service.ts:78`). Keep the
field optional so previously finalized revisions still decode.

*Why:* usage is explicitly not a signed fact and stays editable after lock, so a
frozen copy in the signed blob could only ever be stale. Keeping it out is what
makes "editable on a locked roster without changing the revision" true by
construction.

*Alternative considered:* keep snapshotting usage for completeness. Rejected: it
contradicts the post-finalize editability requirement and adds a divergent copy.

### D6: Permission and management screens follow the reference-catalog pattern

Add `MTU_CATALOG_MANAGE = "mtu-catalog.manage"` to `permissions.ts`, seed it in
`seed.ts`, and grant it to `administrator` and `training-major` (not
`instructor`). Build `/staff/mtu-catalog` (list), `/staff/mtu-catalog/new`, and
`/staff/mtu-catalog/[id]` mirroring `sites/`. Instructors select usage through
their existing class access; no new permission is needed for that, because
`requireClassAccess` already scopes class usage to assigned staff and elevated
roles.

### D7: Initial catalog seeded from a code-owned list, idempotently

The 18 equipment and 7 supplies entries live in one code-owned constant,
`MTU_CATALOG_SEED` (`reference/constants.ts`). They are inserted two ways:

1. A one-off migration (`drizzle/0032_seed_mtu_catalog.sql`) inserts them only
   when `mtu_catalog_items` is empty, so a first production deploy gets them.
2. `reference-seed.ts` inserts them with `onConflictDoNothing`, so a later
   `db:seed` — and, critically, the integration/e2e reset, which truncates every
   public table — repopulates a cleared catalog.

`onConflictDoNothing` never updates an existing row, so neither path overwrites
staff edits (the actual trap was an `onConflictDoUpdate` seed). No backfill of
existing free text.

*Why the seed script too, not just the migration:* the test and e2e resets run
`migrate` (already applied) then truncate all tables and re-run
`seedFoundation`/`seedReferenceData`. A migration-only seed is wiped by that
truncate and never re-runs, leaving those databases without a catalog. Seeding
from the same constant in `reference-seed.ts` keeps the two databases correct
and keeps a single source of truth.

The `mtu-catalog.manage` permission follows the permission convention and is
seeded via `db:seed`.

### D8: Retire lifecycle reuses active/inactive/archived

Only active entries are offered for selection. Inactive and archived entries
remain recorded; archived entries leave the management list. An entry that has
been used on a class is never hard-deleted (join uses `restrict`).

## Risks / Trade-offs

- **Rounding drift** → the estimate is one pure function; unit-test
  `ceil`/`exact`, fractional rates, and zero/absent rules before wiring UI.
- **Retired item renders blank on history** → reads must join inactive and
  archived items, not filter by `is_active`; add a scenario-backed test.
- **Finalize gate blocks finalization on a save failure** → usage upsert and
  finalization run in one transaction, so a failure rolls both back; no partial
  state.
- **New permission not granted** → `db:seed` must be run; the permission is
  inert until seeded. Note this in the migration plan.
- **Two usage UIs diverge** → class setup (`class-form.tsx`,
  `class-creation-wizard.tsx`) and the review section (`mtu-usage-form.tsx`)
  must both use the shared catalog + suggestion logic in `mtu.ts`; centralize.
- **Suggestion vs manual confusion** → surface `source` in the UI (suggested
  value shown as a default with an edit affordance) so operators understand what
  will recompute.

## Migration Plan

1. Add `mtu_catalog_items` and `class_mtu_usage_items` via `db:generate` /
   `db:migrate`; leave `mtu_usage` columns intact.
2. Add the guarded one-off migration that seeds the 25 entries when the table is
   empty.
3. Add and seed `mtu-catalog.manage`; add screens and services.
4. Ship the structured usage read/write and the finalization step.
5. Rollback: dropping the two tables and the step restores free-text-only
   behavior; existing `mtu_usage` text is untouched throughout, so no data is
   lost by reverting.

## Open Questions

- Exact initial `sort_order` (catalog order vs alphabetical) for the seeded
  entries — cosmetic, decidable at implementation.
- Whether the management screen groups the two kinds as tabs on one route or as
  two sibling routes — either satisfies the spec; pick at implementation.
