## 1. Shared chapter selector

- [x] 1.1 Add a `ChapterSelect` that uses `SearchSelect` when catalog chapters exist and a plain text input when they do not.
- [x] 1.2 Build grouped options from each chapter's section, keeping `chapterLabel` as both the option label and stored value.
- [x] 1.3 Add the pinned `Not listed (type one)` choice and its footer input for typed chapters.
- [x] 1.4 Start in `Not listed` with the value populated when an existing chapter is not in the selected curriculum's catalog.
- [x] 1.5 Reset the local `Not listed` state when the curriculum changes or the chapter value is cleared.
- [x] 1.6 Keep the submitted `curriculumChapter` field contract unchanged with a hidden input where a form name is needed.

## 2. Class creation

- [x] 2.1 Replace the Fire subject datalist with `ChapterSelect`.
- [x] 2.2 Clear the subject's chapter when its curriculum changes.
- [x] 2.3 Keep the chapter required in the wizard when the chosen curriculum has catalog chapters.

## 3. Session editing

- [x] 3.1 Replace the component form datalist with `ChapterSelect`.
- [x] 3.2 Clear the session's chapter when its curriculum changes.
- [x] 3.3 Require the session chapter when the chosen curriculum has catalog chapters, matching the server rule.

## 4. Tests

- [x] 4.1 Add unit coverage for grouped options, catalog matching, the `Not listed` sentinel, and chapter clearing.
- [x] 4.2 Update browser selectors that target the old chapter datalist input.
- [x] 4.3 Add browser coverage that every catalog chapter is present, filtering narrows the list, `Not listed` reveals the typed input, and changing the curriculum clears the chapter.
- [x] 4.4 Add session-editor coverage for the shared control and the required chapter.

## 5. Verification

- [x] 5.1 Run `npm run check`, `npm run test`, and `npm run build`.
- [x] 5.2 Run the class-creation, curriculum-chapter, Fire-roster, and review browser suites.
- [x] 5.3 Run `openspec validate replace-chapter-datalist --strict`.
