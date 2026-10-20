## Why

The post-class workspace is close, but three things still fight the instructor at the moment of review:

- **MTU usage is a list, not a fact.** Its area renders a truncated one-line summary ("2 × Chest seal · 3 × Gauze +2"), yet the quantities are partly estimated from the roster, so the operator cannot scan the full usage for accuracy without opening the editor.
- **Hours are shown as decimals.** The roster reads `3.50 / 4`, session badges read `2.50 hours`, and the summary reads `4.5 hours`. Instructors think in hours and minutes.
- **The roster carries noise.** Its Status column says "Present" for people who are obviously present, and "Needs attention" repeats what the row tint and the readiness panel already say. Credit is also typed as an arbitrary decimal (`step 0.01`) even though class hours move in quarter-hour steps.

## What Changes

- The MTU area presents the recorded usage as a **full, grouped review list** — Equipment, Supplies, Transport, Other — with no truncation and no one-line summary. Choosing Edit **replaces the list with the editor**. A class whose destinations do not include the MTU shows no MTU area at all.
- Each supply states its provenance: **estimated** when it follows the roster estimate, and **set** (with the estimate shown) when an operator overrode it.
- **Still-estimated supplies raise a non-blocking advisory** beside Readiness — "N supplies still use the roster estimate" — with a control that opens the MTU area. The advisory does not withhold finalization.
- The roster **drops the Status column**; a participant who needs attention is marked inline (marker plus the existing row tint). Its hours read `3h 30m / 4h`.
- **Hours are shown in hours and minutes everywhere in the workspace** — header, schedule summary, session rows, and roster — rather than as decimals.
- Credit is entered as **hours + minutes** with 15-minute increments, bounded by the scheduled total. Enforcement is **interface-only**; the server's bounding rule is unchanged.
- Not changing: the edit screen's MTU block (an operator may still need to add items), server-side validation, the finalize panel, documents-and-delivery, or the schema.

## Capabilities

### New Capabilities

<!-- None. -->

### Modified Capabilities

- `guided-roster-finalization`: the MTU area is a grouped review list with estimated/set markers and an editor that replaces it; Readiness carries non-blocking advisories; the roster drops its Status column and presents hours in hours and minutes; credit is entered in 15-minute increments.

## Impact

- `src/app/staff/(protected)/classes/[id]/review/page.tsx` — MTU review list, advisory, roster columns, hours formatting.
- `src/app/staff/(protected)/classes/workspace-areas.tsx` — an always-visible review region beside the togglable editor.
- `src/app/staff/(protected)/classes/roster-controls.tsx` — hours + minutes selects in place of the decimal credit input.
- A small hours-formatting helper used by the workspace and session rows.
- `src/app/globals.css` — the MTU review list and advisory styles.
- No schema migration, no server validation change, no finalization change.
