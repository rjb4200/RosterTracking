## Why

Three follow-ups from the post-class workspace:

- The roster expands every row that needs attention, which buries the compact list it was meant to be; a flagged row should stay compact until the operator opens it.
- The MTU usage area summarises to "Recorded" / "Not recorded", which tells an operator nothing about what was actually used.
- Instructors can only be set as the lead. There is no way to add a second (assisting) instructor, remove an assignment, or change the lead in a usable way.
- Reported: making a class longer still seems to require adding the hours to each participant, even though the schedule write path carries a raised total to participants at the previous total. This change confirms that behaviour and fixes it if the report is reproducible.

## What Changes

- Roster rows on the review workspace **no longer expand automatically**; a row that needs attention stays flagged and compact, and expands only when the operator chooses to.
- The MTU usage area summarises the **recorded usage** (equipment, supplies, transport with mileage, or free text) instead of "Recorded".
- The Instructors area can **add a non-lead instructor**, **remove an assignment**, and **change the lead**; removing the class's only lead is refused, and the Fire instructor guard is re-checked.
- Re-verify the **class-runs-long** propagation on `dev` against the exact reported flow; fix only if it reproduces.
- Not changing: the recorded-MTU-usage requirement, the finalization panel, the documents-and-delivery section, the signing model, or any schema.

## Capabilities

### New Capabilities

<!-- None. -->

### Modified Capabilities

- `guided-roster-finalization`: a roster row that needs attention is flagged rather than expanded, and the MTU usage area summarises the recorded usage.
- `class-management`: a class's instructors can be assigned as lead or assisting, an assignment can be removed, and the lead can be changed; removing the only lead is refused.

## Impact

- `src/app/staff/(protected)/classes/[id]/review/page.tsx` — the roster row no longer opens by default; the MTU area summary is derived from the recorded usage.
- `src/app/staff/(protected)/classes/instructor-assignment-form.tsx` — lead/assisting selection and a remove control.
- `src/app/staff/(protected)/classes/[id]/review/page.tsx` and the class edit screen — the instructors card gains the add/remove/change-lead controls.
- `src/app/staff/(protected)/classes/actions.ts` — a remove-instructor action.
- `src/modules/classes/services.ts` — a `removeClassInstructor` service (refuse the last lead; Fire guard on change).
- `src/app/globals.css` — instructor-row controls styling.
- No schema migration; no change to finalization, sign-in, or output generation.
