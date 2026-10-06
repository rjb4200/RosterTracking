## 1. Reference data and schema

- [x] 1.1 Add a `curriculum_chapters` table (curriculum FK, optional section, number, title, position, source revision, active flag) with a unique key on curriculum, section, and number, plus a migration
- [x] 1.2 Add nullable `curriculum_chapter` and `curriculum_name` columns to `class_components` with a migration
- [x] 1.3 Add an upsert-and-list chapter service in `reference/services.ts` mirroring `importCurricula`/`listCurricula`
- [x] 1.4 Import the supplied chapter catalog into the approved curricula: Essentials 8th (Firefighter I 1–16, Firefighter II 1–7), Fire Officer 5th (Fire Officer I 1–9, Fire Officer II 10–15), Fundamentals for Support Personnel 1st (1–13, no section); editions without a year

## 2. Validation and persistence

- [x] 2.1 Extend `fireSubjectInput` and `componentInput` in `classes/services.ts` with `curriculumChapter` and `curriculumName`, and persist them when creating and updating components
- [x] 2.2 Update `actions.ts` to parse the new chapter and typed-book hidden fields for create and update
- [x] 2.3 Extend Fire subject validation (`classes/fire-subjects.ts` and the wizard `validateStep`) so a chapter is required only when the selected curriculum has catalog chapters

## 3. Option loading

- [x] 3.1 Extend `listClassFormOptions` to return the chapter catalog and pass it to the wizard and `ComponentForm`
- [x] 3.2 Default the chapter prop in `ComponentForm` and keep edit/review callers working when chapters are absent

## 4. Fire subject UI

- [x] 4.1 Add a Chapter control to `fire-subject-fields.tsx` as an input with a `<datalist>` of the selected curriculum's chapters, labelled `"<section>: Chapter <number>. <title>"` (or without the section when none), always accepting free text
- [x] 4.2 Add a free-text book field to `fire-subject-fields.tsx` for books outside the approved catalog, taking precedence over the catalog selection
- [x] 4.3 Wire the chapter and typed book into `class-creation-wizard.tsx` state, hidden inputs, and step validation
- [x] 4.4 Add the same book and chapter controls to `component-form.tsx`
- [x] 4.5 Add a scoped CSS rule so the wizard and edit text inputs use a white background like the other fields

## 5. Finalization and print

- [x] 5.1 Add `curriculumChapter` and `curriculumName` to the finalization component snapshot in `classes/finalization.ts`
- [x] 5.2 Extend `FinalizationSnapshot.components` in `official-roster-pdfs/service.ts` with the optional chapter and typed book
- [x] 5.3 Update `curriculumLabel` and the KFS-1A renderer to print `<book> - <chapter>`, where the chapter is the same label the selector offers (including its section), using the typed book name when present and omitting absent values

## 6. Verification

- [x] 6.1 Add unit tests for the chapter-required rule, the typed-book precedence, and the curriculum label composition
- [x] 6.2 Add an integration test covering chapter import, subject persistence, finalization snapshot, and KFS-1A output
- [x] 6.3 Add an e2e test for selecting a catalog chapter, typing a chapter, and entering a book outside the catalog in the wizard
- [x] 6.4 Run `npm run check`, `npm run test`, and `npm run test:integration`
