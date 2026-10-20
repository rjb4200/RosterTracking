## Context

The workspace shows one summary line per area. That works for Instructors (a name list) and Schedule (a duration), but MTU is a **list of items with quantities and provenance**: `MtuUsageItem` carries `name`, `unitLabel`, `quantity`, `suggestion` (the live roster estimate), `source` (`suggested` | `manual`), and `mileage`, and for `source: suggested` the effective `quantity` *is* the live suggestion (`services.ts:1985-2022`). Meanwhile the roster renders `3.50 / 4`, session rows render `2.50 hours`, and credit is entered as an arbitrary decimal (`step="0.01"`).

## Goals / Non-Goals

**Goals:** scan MTU usage at a glance, including which quantities are estimates; a non-blocking advisory for unconfirmed estimates; hours in hours and minutes; a leaner roster with 15-minute credit entry.

**Non-Goals:** server-side quarter-hour validation, hiding the MTU block on the edit screen, changing finalization or documents, any schema change.

## Decisions

**The MTU area is a review list, and Edit replaces it.** No one-line summary; the grouped list is the area's content. Choosing Edit swaps the list for the editor rather than stacking them (the operator asked for the cleaner of the two). *Alternative:* keep the list above the editor — rejected as duplicate content.

**Estimated vs set comes from the existing fields.** `source: suggested` renders `estimated`; `source: manual` renders `set · estimate N` when it differs from `suggestion`. No new query or column.

**Advisories are separate from blockers.** Readiness keeps `issues` (blocking, withholding finalization). Estimated supplies produce an advisory computed from `classRecord.mtuUsage`: "N supplies still use the roster estimate", shown beside the readiness state with a control that opens the MTU area. `ready` is unaffected. *Alternative:* add estimates to `issues` — rejected; estimates are valid and must not block signing.

**One hours formatter, applied across the workspace.** `formatHours` converts quarter-step decimals into `3h 30m` / `4h` / `15m`, using `Math.round(hours * 60)` to avoid floating-point drift. It is used in the roster cell (`3h 30m / 4h`), the header meta, the schedule summary, and session rows. *Alternative:* roster-only — rejected so the same number never appears as both `3h 30m` and `3.50`.

**Credit is entered as hours + minutes, bounded by the total.** Two selects (hours, minutes in 00/15/30/45); the minute menu omits values that would exceed the scheduled total. Enforcement is interface-only, as chosen: the server keeps its existing bounds check. *Alternative:* reject non-quarter values server-side — declined for now; recorded as a trade-off.

**The Status column goes; the flag moves inline.** Removed attendance already has its own collapsed list, so "Present" is noise, and "Needs attention" duplicates the row tint and the readiness panel. A participant needing attention gets a marker beside the name and keeps the row tint.

## Risks / Trade-offs

- [Interface-only increments] → A direct request can still store `3.37`, and existing decimals persist; they are corrected on the next edit. Accepted; the server bound still prevents out-of-range credit.
- [Long MTU lists] → A large catalog makes a long list. Accepted: the point is to scan the full usage, so no truncation and no cap.
- [Formatting drift] → All hour displays must use the helper; a stray decimal would reintroduce the inconsistency. Covered by tests that assert the formatted text.
- [Existing tests assert decimal text] → The review specs assert `3.50 / 4`; they move to the formatted string as part of the change.

## Migration Plan

No schema change and no data migration; hours stay stored as quarter-step decimals. Rollback reverts the page and controls.

## Open Questions

- None blocking. The only assumption is that the hours format applies everywhere in the workspace, not only the roster.
