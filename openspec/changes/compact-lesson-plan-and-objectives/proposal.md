# Proposal

## Why

The lesson plan and course objectives boxes are taller than their content needs, which invites long entries. The KFS-1A Lesson Plan cell is narrow, so long lesson plans wrap or shrink on the printed roster. Selecting a catalog chapter already gives the app the chapter title, but staff still have to retype it into the lesson plan.

## What Changes

- Present the Fire lesson plan as a compact one-line textarea instead of a two-line box.
- Present the KBEMS course description/objectives as a compact two-line textarea in class creation and class editing instead of three or four rows.
- Do not add a hard character limit or a live counter; keep the existing server limits and stored text behavior.
- When staff select a catalog chapter and the lesson plan is empty, fill the lesson plan with the chapter title only.
- Preserve a manually edited lesson plan. If the lesson plan still matches the title from the previous chapter, update it when the chapter changes; if the chapter is cleared, clear that auto-filled title.
- Apply the same lesson-plan behavior in class creation and in the session editor used by the class edit page and post-class workspace.
- Leave chapter labels, chapter storage, roster output, certificate output, and server validation unchanged.
- Keep KBEMS-E16 roster generation and objective printing out of scope; objectives remain captured data but are not printed by the current certificate or KFS-1A generators.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `class-creation-wizard`: the Fire subject lesson plan is a compact field and an empty lesson plan is seeded from the selected chapter title; the KBEMS objectives field is compact.
- `class-management`: the session lesson plan is a compact field and an empty lesson plan is seeded from the selected chapter title; the class-edit objectives field is compact.

## Impact

- `src/app/staff/(protected)/classes/fire-subject-fields.tsx`
- `src/app/staff/(protected)/classes/component-form.tsx`
- `src/app/staff/(protected)/classes/class-creation-wizard.tsx`
- `src/app/staff/(protected)/classes/class-form.tsx`
- `src/modules/classes/fire-subjects.ts` for a shared chapter-title helper
- Unit and browser coverage for compact fields and chapter-title filling
- No database, migration, API, PDF-mapping, or server-validation changes
