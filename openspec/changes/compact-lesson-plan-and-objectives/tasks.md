# Tasks

## 1. Chapter-title lesson-plan behavior

- [x] 1.1 Add a shared helper that returns a catalog chapter's title for lesson-plan seeding, returning no value for a typed or missing chapter; verify with unit tests.
- [x] 1.2 Apply the fill/preserve/replace/clear rule to `FireSubjectRow`; verify an empty lesson plan fills, manual text is preserved, an auto-filled title updates on chapter change, and clearing the chapter clears only the auto-filled title.
- [x] 1.3 Make the `ComponentForm` lesson plan controlled and apply the same rule; verify a session edit fills an empty lesson plan, preserves manual text, and still submits `name="lessonPlan"`.

## 2. Compact fields

- [x] 2.1 Reduce the Fire subject lesson plan textarea to one row in class creation and session editing; verify the rendered form shows a compact lesson plan field.
- [x] 2.2 Reduce the KBEMS course description/objectives textarea to two rows in the creation wizard and class edit form; verify the rendered forms show a compact objectives field.
- [x] 2.3 Confirm no hard character limit or counter is added and the existing server validation remains unchanged; verify the value still submits through the existing form paths.

## 3. Integration and verification

- [x] 3.1 Add browser coverage for chapter selection in class creation and session editing, including empty-fill, manual preservation, chapter change, and chapter clear; run the targeted suites.
- [x] 3.2 Run `npm run check` and `npm run test`.
- [x] 3.3 Run `openspec validate compact-lesson-plan-and-objectives --strict`.
- [x] 3.4 Generate a KFS-1A roster with a chapter-assisted lesson plan and confirm the title appears in the Lesson Plan cell.

## Workflow follow-up

- Archive the change after review and the browser/roster checks pass.
