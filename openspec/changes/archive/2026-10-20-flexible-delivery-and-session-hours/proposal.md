## Why

Instructors need to describe how a class was actually delivered, and real classes mix methods: one session may be classroom, another hands-on, and a single session may be both. The current single-valued delivery method — with "Hybrid" as a special case — forces every session into one method and makes hands-on sessions an exception. The session editor also still asks for decimal hours even though class time moves in quarter hours, and site selection is coupled to delivery, which produces online-only special cases and inconsistent UI behavior.

## What Changes

- Class delivery becomes a non-empty set of **Classroom**, **Hands-On**, and **Online**, replacing the single value and the special "Hybrid" value. It is the default for new sessions.
- Each session stores its own non-empty set of KFS-1A methods (**CR**, **HO**, **OL**), defaulting from the class delivery and independently editable. Any combination is valid; an HO session is ordinary, not an exception.
- Changing the class delivery default updates only sessions still equal to the previous default; sessions that already differ are preserved.
- **BREAKING** `hybrid` is retired as a stored value. Existing rows migrate to `classroom,online`, and legacy reads normalize it.
- **BREAKING** A training site is required for every class regardless of delivery. The delivery-based site rule and the "No site (online only)" UI handling are removed. Existing site-less classes are backfilled to a site named "Online", created if needed.
- The class delivery and session method controls become checkbox groups rather than single selects.
- Session credited hours are entered as **hours + minutes** in 15-minute increments in both the creation wizard and the session editor. Remaining decimal hour displays use the existing hours-and-minutes formatter.
- Class-level delivery remains the stored default; session rows show their own methods, and class-level output uses the union of session methods.

## Capabilities

### New Capabilities

<!-- None. -->

### Modified Capabilities

- `class-management`: delivery is a set; a session's KFS-1A method is a per-session set that defaults from delivery; a training site is required for every class; the special `hybrid` value is retired.
- `class-creation-wizard`: delivery is a multi-select; the training site is always required; the scheduled duration is entered in 15-minute increments.
- `guided-roster-finalization`: the session editor sets methods as a multi-select and credited hours in 15-minute increments; session hours are presented in hours and minutes.
- `official-roster-pdfs`: the KFS-1A marks the session's recorded method set rather than a method derived solely from the class delivery method.

## Impact

- Schema and migration: relax `classes_delivery_method` and `class_components_method` checks to allow every non-empty subset; backfill `hybrid` to `classroom,online`; backfill null sites and set `training_site_id` `NOT NULL`; drop `classes_site_required`.
- Core logic: `src/modules/classes/constants.ts`, `fire-subjects.ts`, `policy.ts`, `services.ts`, and `src/server/db/schema/classes.ts`.
- UI: `class-creation-wizard.tsx`, `class-form.tsx`, `component-form.tsx`, the review and edit pages, `time.ts`, and the class summary, list, and sign-in record displays.
- No new tables or columns. Finalized snapshots keep string values and normalize legacy `hybrid` on read.
- Tests: unit coverage for the set mapping and parsing, integration coverage for creation, updates, and session editing, and browser coverage for the delivery and hours controls.
