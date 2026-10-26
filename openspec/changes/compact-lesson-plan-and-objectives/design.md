## Context

The Fire subject row and session editor both render the lesson plan as a full-width, two-row textarea. The KBEMS objectives field in class creation is four rows and the class-edit form is three rows. Staff have asked for smaller boxes because the current height invites text that does not fit the narrow KFS-1A Lesson Plan cell. No hard character limit is desired.

The chapter selector already knows the selected catalog chapter's `title`. Today it only stores the full chapter label and leaves the lesson plan untouched. The title is the right compact seed: the full label (`Firefighter I: Chapter 3. Communications`) is wider than the lesson-plan cell, while `Communications` is concise.

## Goals / Non-Goals

**Goals:**

- Make the lesson plan and objectives fields visually compact without adding a character counter or hard limit.
- Fill an empty lesson plan with the selected catalog chapter's title.
- Preserve manually entered lesson plan text.
- Update or clear an auto-filled title only when it is still the previous chapter's title.
- Apply the same behavior to class creation and the session editor.

**Non-Goals:**

- Changing stored lesson-plan or objectives limits, validation, or database fields.
- Changing chapter labels, chapter storage, or the chapter selector.
- Changing certificate or KFS-1A output.
- Wiring the KBEMS-E16 roster or printing objectives.
- Inferring a lesson plan for typed chapters that are not in the catalog.

## Decisions

### Use the chapter title as the compact seed

When a catalog chapter is selected, use `chapter.title` rather than `chapterLabel(chapter)`. The title is short enough to be useful in the KFS-1A cell, while the full label includes the curriculum section and chapter number that the Curriculum column already carries.

### Fill only an empty lesson plan

On a chapter change:

1. Find the previously selected catalog chapter, if any.
2. If the lesson plan is empty, fill it with the new chapter title.
3. If the lesson plan equals the previous chapter title, treat it as auto-filled and replace it with the new title.
4. Otherwise, preserve the manual text.

If the chapter is cleared or the curriculum changes, clear the lesson plan only when it still equals the previous chapter title. This avoids overwriting a lesson plan the user typed while preventing a stale auto-filled title.

A typed `Not listed` chapter has no catalog title, so it does not seed the lesson plan.

### Compact fields, no hard limit

Use a one-row textarea for the lesson plan and a two-row textarea for course objectives. Keep the existing labels and server limits. The smaller control reduces the invitation to overtype but does not prevent a long value; a character counter or limit can be added later if real overflow persists.

### Apply the same rule in both forms

`FireSubjectRow` already holds the lesson plan in wizard state, so it can update it directly. `ComponentForm` currently renders the lesson plan uncontrolled with `defaultValue`; make it controlled so the chapter change can seed and clear it while the form still submits the same field.

### Leave objectives as stored data

Objectives remain captured for the KBEMS step and class edit, but no current PDF generator prints them. This change only makes their field compact. The KBEMS-E16 template already contains a `Course Description or Objectives` field, but it has no registered mapping/generator; wiring that form is a separate change.

## Risks / Trade-offs

- **A chapter title can still be long** → The title is shorter than the full chapter label, and the field still wraps/shrinks in the roster. No hard limit is added by request; revisit with a counter if overflow remains.
- **Heuristic auto-fill could treat a manually typed title that exactly matches the chapter title as auto-owned** → The result is the same title; a later chapter change would update it, which is the intended behavior for an auto-filled value.
- **The session editor loses its uncontrolled textarea behavior** → Make the lesson plan controlled and keep the same `name="lessonPlan"` submission contract; cover the edit flow with tests.
- **Existing blank lesson plans with a chapter already selected** → Do not migrate or seed on load. The fill occurs when the chapter is selected or changed, so opening and saving an old record does not add text unexpectedly.
- **Objectives still do not print** → This change deliberately leaves the KBEMS-E16 integration out of scope; the compact field is only a data-entry improvement.

## Migration Plan

No database migration. Existing lesson plans and objectives are unchanged; the new behavior applies when staff select or change a chapter. Rollback is a UI-only revert.

## Open Questions

None.
