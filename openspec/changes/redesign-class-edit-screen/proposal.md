## Why

The open-class edit screen renders three flat sections, each an always-open form, stacked in one column: a single ~13-field "Class details" grid, then a full repeated 12-field form for every session plus another to add one, then instructs. A two-session class produces five large forms and roughly forty inputs with no navigation, no summary, no save state, and no removal controls. The result is a page instructors misread — session fields look class-level, EMS and MTU fields show on classes that don't use them, and it is easy to edit the wrong row.

## What Changes

- Reorganize the edit screen around the class's **reporting destinations** (Fire, KBEMS, MTU): the reporting selection becomes the page's route selector, and only the cards that route needs are shown.
- Group editing into named cards with collapsed summaries, one open at a time: Class basics, Reporting, a KBEMS **EMS course details** card shown only when KBEMS is selected, an MTU **usage** card shown only when MTU is selected, Sessions, and Instructors.
- Make the **session editor reveal destination-specific fields on demand**: Fire subject fields (category, class name, curriculum, chapter, lesson plan) only while Fire is selected, and the KBEMS method only while KBEMS is selected.
- Replace the always-open repeated session forms with a **schedule list of read-only rows** and a single open editor, showing each session's computed end time, a running credited-hours total, and inline warnings for same-day overlaps; add explicit **Remove session** and **Remove instructor** controls.
- Make the **Instructors card state the consequence** ("the lead signs the roster") and, while Fire is selected, that at least one assigned instructor must be fire-qualified.
- Frame the page: a banner stating that this is an open class whose edits reach the live sign-in roster and that finalization happens on the review screen, an anchor nav with counts, and a sticky **At a glance** summary (status, schedule range, total hours, destinations, lead, PIN state).
- Make destination-scoped data **consistent**: removing a destination clears its class-level details on save, and the update path enforces that a class cannot retain EMS or MTU data for a destination it does not report to.
- Give each card **one save with clear saved/unsaved feedback**.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `class-management`: the open-class edit screen is organized by reporting destination, shows only the cards a class's reporting selection requires, reveals destination-specific session fields on demand, presents sessions as an editable schedule with removal and totals, and keeps destination-scoped class details consistent when reporting changes.

## Impact

- `src/app/staff/(protected)/classes/[id]/edit/page.tsx` — rebuilt around destination-driven cards, anchor nav, and a summary.
- `class-form.tsx` — split into grouped cards driven by the `reportingSystemIds` state; EMS fields conditionally rendered; reporting warning made conditional on existing attendance.
- `component-form.tsx` — Fire fields and the KBEMS method conditionally rendered; used by a single open session editor instead of repeated inline forms.
- `instructor-assignment-form.tsx` — explicit lead/remove controls and the fire-qualification note.
- `src/app/globals.css` — card, summary, and schedule-row styles.
- `src/modules/classes/services.ts` — destination-scoped clearing on update, a server guard rejecting EMS/MTU data for unselected destinations, and session/instructor removal services.
- `src/app/staff/(protected)/classes/actions.ts` — remove-session and remove-instructor actions.
- No schema migration and no change to finalization, sign-in, or output generation. Consolidating the edit and review screens is explicitly out of scope.
