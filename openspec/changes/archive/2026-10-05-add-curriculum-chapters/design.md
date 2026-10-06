## Context

See `proposal.md -- Why`. Current state that shapes the approach:

- A Fire subject is stored on `class_components` as `trainingCodeId`, `className`, `curriculumId` (FK to `curricula`), and `lessonPlan` (`src/server/db/schema/classes.ts`).
- The subject row UI is `fire-subject-fields.tsx` (wizard) and `component-form.tsx` (post-creation edit/review). The wizard holds subjects in `class-creation-wizard.tsx` and submits them as hidden inputs parsed in `actions.ts`, then validated in `classes/services.ts` (`fireSubjectInput`, `componentInput`).
- `listClassFormOptions` (`classes/services.ts`) loads training codes and curricula for the wizard and the edit/review forms.
- Finalization snapshots each component's `curriculumPublisher`, `curriculumProgramTitle`, `curriculumVersion`, and `lessonPlan` (`classes/finalization.ts`), typed as `FinalizationSnapshot.components` in `official-roster-pdfs/service.ts`.
- The KFS-1A Curriculum cell is rendered by `curriculumLabel()` as `<publisher> <program title> <version>` (`official-roster-pdfs/service.ts:275`).
- `curricula` has no chapter data. The approved chapter reference is now available: Essentials of Fire Fighting 8th edition (sections Firefighter I, 1–16, and Firefighter II, 1–7, which reuses numbers), Fire Officer Principles and Practice 5th edition (sections Fire Officer I, 1–9, and Fire Officer II, 10–15), and Fundamentals of Firefighter Skills for Support Personnel 1st edition (no sections, 1–13).
- The shadcn `Input` renders `bg-transparent`; `.search-input`/`.select-input` are white. The wizard uses `<Input>` for book/class-name text fields, so those look different from the white selects/textareas. Login and sign-in forms already scope white backgrounds per form rather than changing the shared component.

## Goals / Non-Goals

**Goals:**
- A chapter catalog tied to approved curricula, loaded from the supplied reference.
- Per-subject chapter selection that suggests catalog chapters and always accepts free text, plus a typed book outside the catalog.
- The chapter printed with the curriculum on KFS-1A, preserved through finalization.
- Consistent white backgrounds for the wizard/edit text inputs.

**Non-Goals:**
- Changing the lesson plan's meaning; it remains a separate free-text field.
- Creating curriculum records from typed books (they stay free text on the subject).
- Changing the shared shadcn `Input` for the whole app.

## Decisions

### Decision: Chapters are a `curriculum_chapters` table, not JSON on `curricula`

Add `curriculum_chapters (id, curriculum_id FK, part, number, title, position, source_revision, is_active, timestamps)` with a unique key on `(curriculum_id, part, number)` so the reference import upserts cleanly. `part` is the optional section a chapter belongs to (for example "Firefighter I") and is required for the unique key because at least one approved book reuses the same chapter numbers across its sections. A JSON column on `curricula` was considered but rejected: a table is listable per book, importable/versionable like the other reference data, and avoids rewriting a whole array on each import.

### Decision: Store the chapter and typed book on `class_components`

Add `curriculum_chapter text` and `curriculum_name text` (both nullable) to `class_components`. The chapter is stored as the **composed label the selector shows** (`"<section>: Chapter <number>. <title>"` when the chapter has a section, otherwise `"Chapter <number>. <title>"`), which keeps a typed chapter and a selected catalog chapter on the same footing, needs no join at print time, and makes the printed chapter byte-identical to the selector. `curriculum_name` is a plain string because a typed book is intentionally outside the `curricula` FK. Both are preserved on the finalization snapshot and extend `FinalizationSnapshot.components` as optional fields (older revisions predate them).

### Decision: Chapter selection uses a native input + `<datalist>`

The repo has no combobox primitive (`components/ui` is badge/button/dialog/input/label/select/table). A plain `<input list="...">` with a `<datalist>` of the selected curriculum's chapters gives suggestions *and* free typing with no new dependency, matching the "free text always allowed" requirement. The book control keeps its existing search + select and gains a separate free-text "not listed" field; when that field is filled it takes precedence over the catalog selection and chapter suggestions fall back to the optional-free-text rule.

### Decision: The selector label includes the section, and print mirrors it

A catalog chapter is offered as `"<section>: Chapter <number>. <title>"` when it has a section, otherwise `"Chapter <number>. <title>"`. The selected value is stored as that exact label, so the KFS-1A prints what the dropdown shows, including the section. A colon is used rather than an em dash so the value stays within the WinAnsi range of the PDF standard fonts.

### Decision: Chapter is required only when the selected book has catalog chapters

Client-side validation (wizard `validateStep`) and server-side validation (`fireSubjectInput`/`componentInput` in `classes/services.ts`) both enforce "chapter required iff `curriculumId` maps to at least one catalog chapter". This requires chapter data client-side; it is loaded with the other options.

### Decision: Extend `listClassFormOptions` and pass chapters through

`listClassFormOptions` gains chapter rows (or curricula with nested chapters). The wizard and `ComponentForm` receive them, defaulting to empty where a caller does not load them. This keeps the existing prop-passing pattern rather than adding a fetch-on-select API route.

### Decision: KFS-1A composes catalog-or-typed book with the chapter

`curriculumLabel()` keeps its current publisher-first catalog label (the publisher is retained because it is no change to existing behavior and the requirement does not depend on it), or uses `curriculum_name` when present, then appends `" - " + chapter`. The chapter is the selector label, so the printed cell mirrors the dropdown exactly and includes the section when the chapter has one. Blank when neither book nor chapter is present, per the existing "omit missing optional value" behavior.

### Decision: Scope white input backgrounds in CSS

Add a scoped rule (for example under `.class-wizard .field` and the edit `.stack-form .field`) setting `background: white` on text inputs, matching `.search-input`/`.select-input`, instead of editing the shared `Input`. This follows the existing `.login-form input` / `.sign-in-field input` pattern and preserves the shared component.

## Risks / Trade-offs

- The chapter reference content is unknown → the importer and catalog shape are defined here, but the actual values are a required input before implementation can complete; the task list calls this out explicitly.
- Passing every chapter to the client enlarges the options payload → acceptable at expected catalog size; revisit with a fetch-on-select route if it grows.
- Enforcing "required when catalog chapters exist" depends on chapter data being loaded → if a caller omits it, a known-chapter book would look chapter-less; the validation must treat missing catalog data conservatively (no requirement) and the loaders must supply it in the wizard and edit forms.
- Old revisions lack the new snapshot fields → both fields optional and the renderer tolerant, mirroring how `components`/`mtuUsage` are already optional.

## Migration Plan

1. Add the `curriculum_chapters` table and the two nullable `class_components` columns; no backfill required.
2. Import the approved-curricula chapter reference into the catalog.
3. Ship the UI, validation, option loading, snapshot, and PDF changes together.
4. Rollback: revert the deploy; the new table and columns are harmless if left in place.

## Open Questions

- The reference lists each book's title and edition but not its publisher, while `curricula.publisher` is required. The import must therefore match these chapters to existing curriculum rows (or the publishers must be supplied). The task list treats the import as matching the approved curricula already in the catalog.

## Appendix: Approved chapter catalog

Supplied chapter reference, to be loaded by task 1.4. Editions carry no year in the catalog.

**Essentials of Fire Fighting — 8th edition**
- Firefighter I
  1. Introduction to the Fire Service and Firefighter Safety
  2. Operational Scene Safety and Management
  3. Communications
  4. Building Construction
  5. Fire Dynamics
  6. Firefighter Personal Protective Equipment
  7. Portable Fire Extinguishers
  8. Ropes and Knots
  9. Ground Ladders
  10. Forcible Entry
  11. Structural Search and Rescue
  12. Tactical Ventilation
  13. Fire Hose, Hose Operations, and Hose Streams
  14. Fire Suppression
  15. Overhaul, Property Conservation, and Scene Preservation
  16. First Aid Provider
- Firefighter II
  1. Incident Scene Operations
  2. Building Materials, Structural Collapse, and Effects of Fire Suppression
  3. Technical Rescue Support and Vehicle Extrication Operations
  4. Foam Fire Fighting, Liquid Fires, and Gas Fires
  5. Fire Origin and Cause Determination
  6. Maintenance and Testing Responsibilities
  7. Community Risk Reduction

**Fire Officer Principles and Practice — 5th edition**
- Fire Officer I
  1. The Fire Officer as Company Officer
  2. Understanding Leadership and Management Theories
  3. Crew Resource Management
  4. Leading a Team
  5. Community Relations and Risk Reduction
  6. Fire Department Administration
  7. Preincident Planning and Code Enforcement
  8. Command of Initial Emergency Operations
  9. Safety and Risk Management
- Fire Officer II
  10. The Fire Officer II as a Manager
  11. Applications of Leadership
  12. Managing Community Risk Reduction Programs
  13. Administrative Communications
  14. Fire Cause Determination
  15. Managing Major Incidents

**Fundamentals of Firefighter Skills for Support Personnel — 1st edition**
1. The Fire Service
2. Firefighter Health and Safety
3. Personal Protective Equipment
4. Fire Service Communications
5. Fire Behavior
6. Portable Fire Extinguishers
7. Firefighter Tools and Equipment
8. Ropes and Knots
9. Water Supply Systems
10. Fire Hose
11. Supply Line and Attack Line Evolutions
12. Hazardous Materials Regulations, Standards, and Laws
13. Recognizing and Identifying the Hazards
