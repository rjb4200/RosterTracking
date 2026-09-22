## Context

See `proposal.md` — Why. The constraints that shape the approach:

- `roundDepartmentDateTimeToQuarterHour` (`src/modules/classes/time.ts:114`) already rounds to the nearest quarter hour with `Math.round`, and already formats through `formatDepartmentDateTimeInput`. It is currently called in exactly two places, both to seed a default: the class edit page and the review page.
- The create-class wizard submits a raw string; `createClassAction` (`src/app/staff/(protected)/classes/actions.ts:79`) passes `startsAt` through, and the domain schema parses it with `parseDepartmentDateTime` (`src/modules/classes/services.ts:120`).
- The session form already sets `step="900"` on its Starts input (`component-form.tsx:77`), but nothing rounds a typed value.
- `parseDepartmentDateTime` (`time.ts:51`) is timezone-aware: it resolves the department time zone and rejects a local time that does not exist across a daylight-saving transition. Any rounding must operate in department local time, not on the UTC instant, or a quarter-hour could land on the wrong wall-clock minute.
- Session end times are derived as start plus credited hours, and `creditedHours` steps by 0.25, so ends stay on the cadence without separate handling.

## Goals / Non-Goals

**Goals:**
- One rounding primitive shared by visible entry and domain normalization, so the field and the stored value always agree.
- The cadence holds for typed, pasted, and directly posted values, not only for values chosen from the picker.
- Rounding is visible: an off-grid entry snaps in the field rather than being silently changed later.

**Non-Goals:**
- Restricting which quarter hours are allowed (for example, enforcing the top of the hour).
- Rounding end times separately, or changing credited-hour handling.
- Changing the department time zone, DST behavior, or the existing default-time seeding.

## Decisions

**Round after timezone resolution, not on the raw instant.**
The rounding helper must receive a resolved department-local time so that :00/:15/:30/:45 are wall-clock minutes. Rounding the UTC instant would place a "quarter hour" on an arbitrary local minute. *Alternative considered:* rounding the instant before parsing — rejected because it breaks in non-whole-hour offsets and around DST.

**Normalize in the domain schema, not only in the form.**
`createOpenClass` and the class/session start schemas gain a rounding step after `parseDepartmentDateTime`. The form is a convenience; the rule must hold for any submit path. *Alternative considered:* rounding only in the client — rejected because a directly posted value would bypass it, making the cadence advisory rather than real.

**Reuse the existing helper as the single rounding primitive.**
`roundDepartmentDateTimeToQuarterHour` becomes the one place the cadence is defined, called by both the client (to display) and the domain (to normalize). *Alternative considered:* a second client-side rounding expression — rejected as two definitions of the same rule that can drift.

**Show the rounded value by writing it back to the field.**
`datetime-local` has no native snap-on-blur; its `step` only trims the picker list. The wizard and session form therefore round on change/blur and set the field to the rounded string, so the operator sees the value that will be stored.

**Default the wizard start time to the nearest quarter hour.**
The wizard's start field is unset today, unlike the session form which seeds a rounded "now". Defaulting it removes the empty-field case and matches the existing seeding pattern.

**Rounding may roll to the next day.**
`Math.round` at :53 or later carries into the next hour and, at the end of the day, the next date. Accepted by the operator; it is a consequence of nearest rounding and stays consistent with the cadence rule. A roll must not silently produce a different department-calendar day without the operator seeing it in the field, which the visible write-back guarantees.

## Risks / Trade-offs

- [Nearest rounding is not monotonic at the :07/:08 boundary — 09:07 rounds to 09:00 and 09:08 rounds to 09:15] → Inherent to nearest rounding and chosen deliberately; the visible write-back makes the result unambiguous to the operator.
- [A daylight-saving gap could make a rounded local time non-existent] → Rounding happens after `parseDepartmentDateTime` rejects a non-existent input time, and rounding only moves within ±7 minutes; revisit if a gap boundary ever produces a rejected rounded value.
- [Rounding session starts changes existing behavior for typed off-grid values] → Intended: it closes the gap between the `step="900"` picker hint and what the form actually accepted.
- [Session components must share one department-calendar day] → A roll to the next day could conflict with that rule for a session entered near midnight; the existing same-day validation rejects it, which is the correct outcome and should surface as a normal validation error.

## Migration Plan

No schema change and no migration. The rule is applied at input, so existing stored values are untouched. Rollback reverts the commit; already-normalized times remain valid because the cadence only narrows what may be entered.
