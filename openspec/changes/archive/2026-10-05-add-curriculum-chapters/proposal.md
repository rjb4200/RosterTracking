## Why

A Fire subject can only reference an approved curriculum and a free-text lesson plan, so staff cannot record which chapter of a book a session covered, and cannot record a book that is not in the approved catalog at all. The KFS-1A Curriculum cell should carry that chapter so the printed roster matches what was taught.

## What Changes

- Add an approved-curricula **chapter catalog**: ordered chapters (number and title) tied to a curriculum, loaded from the approved curricula reference.
- On each Fire subject, add a **Chapter** field: when the selected approved curriculum has known chapters, offer them as suggestions and require a chapter; always accept a typed chapter; when the book has no known chapters, the chapter is optional free text.
- Let a Fire subject use a **typed book** that is not in the approved catalog, stored as a free-text curriculum name.
- Print the chapter with the curriculum in the KFS-1A Curriculum cell as `<publisher> <program title> <version> - <chapter>`, using the typed book name when present.
- Apply the same book and chapter controls in the post-creation session edit form so the values are captured in the finalization snapshot.
- Give the wizard's text inputs a white background so they match the other fields.

## Capabilities

### New Capabilities

- `curriculum-chapters`: maintain the approved-curricula chapter catalog and let a Fire subject select a chapter or a typed book.

### Modified Capabilities

- `class-creation-wizard`: the Fire step collects a chapter and supports a typed book on each subject row.
- `class-management`: a class session retains an optional chapter and an optional typed curriculum name, preserved at finalization.
- `official-roster-pdfs`: the KFS-1A prints the subject chapter with the curriculum.

## Impact

- **Schema**: new `curriculum_chapters` table; `class_components` gains a chapter value and an optional free-text curriculum name.
- **Reference data**: import/upsert the approved-curricula book/chapter reference into the new catalog.
- **Modules**: `reference/services.ts` (chapter import and list), `classes/services.ts` and `classes/fire-subjects.ts` (subject input and validation), `classes/finalization.ts` (snapshot), `official-roster-pdfs/service.ts` (Curriculum cell rendering).
- **UI**: `class-creation-wizard.tsx`, `fire-subject-fields.tsx`, `component-form.tsx`, and `globals.css` (white input backgrounds).
- **Data**: the chapter catalog is seeded from `approved_curricula_book_chapter_reference`, whose content is still to be supplied.
- No breaking changes; the chapter and typed book are additive and optional outside known-chapter books.
