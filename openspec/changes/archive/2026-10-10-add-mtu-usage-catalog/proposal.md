## Why

Mobile Training Unit equipment and supplies are recorded as free text on each
class, so the grant-funded unit's usage is inconsistent and impossible to
aggregate, and the system cannot show what a class of a given size was expected
to consume. Staff also have no shared catalog of what the unit actually carries.

## What Changes

- Introduce a department-managed **MTU catalog** with two kinds — durable
  **equipment** and consumable **supplies**. Administrators and Training Majors
  create, edit, deactivate, and archive entries; retirement is
  deactivate/archive, never delete, matching the existing reference catalogs.
- Give every supply an **expected-consumption rule**: a per-class base, a
  per-student rate, a rounding mode, and a unit, so consumption can be estimated
  from the final roster size (`qty = per_class + per_student × students`).
  Equipment is a plain on/off selection with no quantity.
- Replace the free-text MTU equipment and supplies usage with structured
  selections from the catalog, while keeping free-text boxes for off-catalog
  extras. The existing `equipment_used` and `used_supplies` columns become those
  extras rather than the primary record.
- **Add a mandatory MTU usage confirmation step to finalization for MTU
  classes**: before the lead instructor signs, the step presents every active
  supply with its expected quantity — decluttered to the rows with a nonzero
  expectation, with the rest behind a disclosure — and the instructor confirms
  or edits the actual quantities.
- Keep MTU usage editable by instructors assigned to the class and by admins
  after finalization, on the locked roster, without reopening the class and
  without changing any signed revision fact (participant count or revision
  number).
- Seed the initial catalog once through a one-off migration; it is admin-managed
  thereafter. **No backfill** of existing free-text usage.

## Capabilities

### New Capabilities
- `mtu-catalog`: a department-managed catalog of Mobile Training Unit equipment
  and supplies, carrying kind, an expected-consumption rule for supplies,
  permission-controlled management screens, and a deactivate/archive lifecycle.

### Modified Capabilities
- `mtu-usage-tracking`: usage moves from free text to structured catalog
  selections plus free-text extras; equipment is on/off, supplies carry
  estimated then confirmed quantities, and usage remains editable after
  finalization without touching signed revision facts.
- `guided-roster-finalization`: adds a mandatory MTU usage confirmation step
  before the lead instructor signs the roster of an MTU class.

## Impact

- **Schema/data**: add `mtu_catalog_items` and `class_mtu_usage_items`; keep the
  existing `mtu_usage` free-text columns as off-catalog extras. A one-off
  migration seeds the initial equipment and supplies.
- **Reference module**: new permission `mtu-catalog.manage`; catalog management
  services and routes following the sites/curricula management pattern
  (`src/modules/reference/services.ts`, `src/app/staff/(protected)/…`).
- **Classes module**: consumption-rule and estimation logic
  (`src/modules/classes/mtu.ts`), structured usage in create/update
  (`src/modules/classes/services.ts`), the finalization gate
  (`src/modules/classes/finalization.ts`), and the wizard, class form, review,
  and MTU-usage UI.
- **Tests**: unit coverage for the consumption rule and rounding; integration
  coverage for catalog lifecycle, structured usage recording, the finalization
  confirmation gate, and post-finalization edits on a locked roster.
