## Context

The open-class edit screen (`src/app/staff/(protected)/classes/[id]/edit/page.tsx`) renders one `ClassForm`, then a read-only row followed by a full `ComponentForm` for every session plus another `ComponentForm` to add one, then an instructor list and `InstructorAssignmentForm`. All three are `<section>` blocks with hairline borders and no collapse, so a two-session class presents five large forms and about forty controls in one column.

Two structures already exist that the page ignores:

- The class-creation wizard branches on reporting destinations — `buildWizardSteps` (`src/modules/classes/destination-steps.ts`) yields a Fire step, a KBEMS step, and an MTU step, and each step renders only its own content (`class-creation-wizard.tsx`).
- `updateClass` (`src/modules/classes/services.ts:955`) writes the EMS fields (`objectives`, `courseType`, `courseNumber`, `emsCategoryId`) from the submitted form on every save, blanking them when absent, and replaces MTU usage unconditionally.

The review screen already wraps the same editing forms in a `<details>`, so progressive disclosure exists there but not on edit.

## Goals / Non-Goals

**Goals:**

- Make the reporting selection the page's organizing principle: only the cards a class's destinations require are shown, and destination-specific fields are revealed on demand.
- Cut mis-edits by giving each group a clear boundary, a summary when collapsed, and a single open editor at a time for sessions.
- Make consequences legible: what each destination enables, that the lead signs the roster, what a reporting change clears, and that edits reach the live roster.
- Keep destination-scoped data consistent in the database, not just the interface.

**Non-Goals:**

- Merging the edit and review screens (both keep their own surfaces for now).
- Auto-finalizing, auto-locking, or changing the overdue-reminder behavior.
- Changing finalization, sign-in, PDF output, or the reporting queue.
- A drag-and-drop schedule builder or inline attendance editing.

## Decisions

### The reporting selection drives the layout

The reporting checkboxes (`reportingSystemIds`) are already controlled client state in `ClassForm`; the page's cards subscribe to that state so a card appears or disappears as its destination is ticked. On first render the visible cards are derived from the class's saved reporting systems, so nothing flashes. This reuses the destination branch the wizard already encodes rather than inventing a second rule.

Destination → content mapping:

| Destination | Card / fields revealed |
|---|---|
| Fire | Session Fire-subject fields (category, class name, curriculum, chapter, lesson plan); fire-instructor requirement noted in Instructors |
| KBEMS | EMS course details (course type, EMS category, course number, objectives; initial-cert number when applicable); session Method |
| MTU | MTU usage (equipment, supplies, transport mileage/items) |
| (always) | Class basics (name, delivery, site, host agency), Student access (PIN), Sessions shell, Instructors shell |

Alternative considered: keep one flat form and only disable irrelevant fields. Rejected — disabling still shows the clutter that causes the mistakes.

### Hiding a destination clears its data on save, and the server enforces it

`updateClass` already blanks absent EMS fields and replaces MTU usage, so "hidden means cleared on save" is the existing semantics made honest. To avoid silent loss when a box is unticked by accident:

- The form keeps the values in component state while hidden, so re-ticking within the same visit restores them and nothing is lost before save.
- Unticking a destination that currently holds data shows an inline note ("KBEMS course details will be cleared when you save").
- `updateClass` gains an explicit guard: when a destination is not selected, its class-level fields are forced to null (EMS) or replaced empty (MTU), regardless of what the form submitted, so a stray request can't leave a Fire-only class carrying EMS course data.

Alternative considered: keep hidden values and persist them. Rejected — it would leave a class reporting to a destination it no longer carries details for, and the certificate path reads those fields.

### Destination-specific validation follows visibility

The initial-certification course-number rule already runs only on the wizard's KBEMS step; on the edit screen it applies only while KBEMS is selected. The Fire FFN requirement applies only while Fire is selected (the service already enforces it when Fire is added or instructors change). Hidden groups never block a save.

### Sessions become a schedule with one open editor

The list renders read-only rows (date/time range, credited hours, title or Fire subject, method) in scheduled order, with a running total and inline warnings for a same-day overlap. Selecting a row opens that row's editor; "Add session" opens a blank editor after the last session. This replaces N always-open forms with N rows and at most one form.

Removal is new: a `removeClassComponent` service and a `removeComponentAction`. Removing the only remaining session is refused (an open class needs at least one session to be roster-ready), matching the existing "at least one component before opening" rule.

### Mutable instructor controls with consequences

The Instructors card names the lead and assistants explicitly, offers "Make lead" and "Remove", and carries the helper that the lead signs the roster; while Fire is selected it states that at least one assigned instructor must be fire-qualified. Removing the last lead is refused rather than silently leaving a class that cannot be finalized. This is written to tolerate the in-progress `add-assistant-instructors` change, which introduces a signing assistant.

### Per-card saves with a visible save state

Each card keeps its own server action (matching the existing `updateClassAction` / `saveComponentAction` / `assignInstructorAction` split) but gains a consistent action row: a disabled-until-dirty submit, a pending label, and a transient "Saved" confirmation. A class-wide "unsaved changes" guard is deferred; the collapsed card summary shows the last-saved facts so drift is visible.

## Risks / Trade-offs

- **Conditional cards can hide a field the operator expects.** Mitigation: collapsed card headers summarize their contents, and the reporting checklist states what each destination reveals.
- **Clearing data on untick surprises someone.** Mitigation: values persist in state until save, an inline note warns, and the server guard makes the outcome deterministic.
- **Fire + KBEMS combined classes are ambiguous.** The current `componentKind` gives Fire precedence, so a combined class offers only Fire categories while still showing the KBEMS Method. Mitigation: the session editor groups category options by selected destination and labels them, rather than silently filtering to one.
- **New remove actions widen the surface area.** Mitigation: guard against removing the last session and the last lead, audit both, and keep removal to open classes.
- **Two editing surfaces (edit and review) drift.** Mitigation: both compose the same `ClassForm`/`ComponentForm`, so the shared pieces change once; consolidating them remains a separate decision.

## Migration Plan

No schema change. Ship behind the existing open-class route; the server guard is additive because it only enforces the clearing that the form already implied. Rollback is reverting the page and service changes; no data backfill is required.

## Open Questions

- Should edit and review eventually merge into one open-class editor, with review becoming finalized-only?
- Should removing the last session or the last lead stay refused, or be allowed with a confirmation?
- Should editing sessions or reporting on a class that already has active attendance require an explicit acknowledgement?
- Does the combined Fire + KBEMS session card show both category groups, or a single destination switch within the session?
