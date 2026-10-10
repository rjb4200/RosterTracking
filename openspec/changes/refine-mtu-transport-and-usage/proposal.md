## Why

The MTU catalog is hard to reach and hardened to the wrong shape: fuel mileage
is not tied to the transport that consumes it, the van is filed as generic
equipment, and supply consumption is edited at class creation when the roster is
empty and the estimate is meaningless. The result is a cluttered usage step and
data entered at the wrong moment.

## What Changes

- Add a third admin-managed MTU catalog kind, **transport**. Move *Ford Transit
  Van 15 passenger* out of equipment into transport, and add *Department
  vehicle* and *POV*. Each transport entry carries a **requires-mileage** flag
  (true for the van and department vehicle, false for POV).
- **BREAKING** (admin catalog shape): `kind` gains `transport`; transport
  entries carry `requires_mileage` and no supply quantity rule.
- Require a **mileage estimate at class creation** when a requires-mileage
  transport is selected. Mileage stays editable at finalization and afterward,
  is **never locked**, and is optional when only POV is selected. The
  requirement is enforced **only on the initial creation**, not on later edits.
- Stop collecting supply **quantities at class creation**: the creation step
  selects equipment, supplies, and transport on/off only. Supply quantities are
  confirmed and edited at finalization.
- Hide the consumption-rule text from the usage UI (rules remain admin-editable
  and drive the finalization estimate).
- Tuck off-catalog equipment and supplies under a collapsed **Additional
  details**.
- Keep the finalization step able to change selections as well as quantities.

## Capabilities

### New Capabilities
<!-- none: transport is a third kind within the existing mtu-catalog capability -->

### Modified Capabilities
- `mtu-catalog`: the catalog gains a transport kind with a requires-mileage
  attribute, and its management screen groups entries by the three kinds.
- `mtu-usage-tracking`: usage selects equipment, supplies, and transport on/off
  at creation; a requires-mileage transport requires a mileage estimate at
  creation only; mileage stays editable and is never locked; supply quantities
  are set at finalization.
- `guided-roster-finalization`: the MTU confirmation step also covers transport
  selections and mileage, alongside confirming supply quantities.

## Impact

- **Schema/data**: `mtu_catalog_items.kind` allows `transport`; add a
  `requires_mileage` column; rule-shape check treats transport like equipment. A
  one-off data migration moves the van to transport and adds Department vehicle
  and POV.
- **Reference module**: seed list (`MTU_CATALOG_SEED`) and kind validation; the
  catalog list groups into three sections; the entry form adds a Transport kind
  with a requires-mileage control.
- **Classes module**: creation-time mileage validation tied to transport
  selections; create/update accept transport selections; supply quantities are
  no longer submitted at creation.
- **UI**: the shared MTU usage fields become selection-only with a Transport
  group and a collapsed, auto-expanding mileage field; the finalization step and
  the off-catalog extras are reorganized.
