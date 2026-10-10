## Why

A curriculum's chapters can only enter the catalog through a developer-run import script (`scripts/import-curriculum-chapters.ts`), so staff cannot add a chapter or correct a title without a code change and a re-import. Chapter authoring should live in the curriculum admin where the rest of the curriculum is maintained.

## What Changes

- Add a **Chapters section to a curriculum's record page** that lists its chapters (ordered by section, then position) with a way to **add, edit, archive, and reactivate** a chapter.
- Capture **section (part), number, title, and source revision** when authoring a chapter; a blank source revision defaults to `manual`.
- **Derive each chapter's position from its number** rather than entering it: a number that begins with an integer sets that position; otherwise the chapter is appended in catalog order.
- Add an **archived state** to chapters (`archivedAt`) with parity to the other reference catalogs: an archived chapter is hidden from the class editor and can be reactivated.
- **Revive on re-add**: authoring a chapter whose section and number match an archived chapter reactivates it; matching an active chapter is a validation error.
- The existing import script remains in the codebase but the chapter catalog becomes **admin-owned** going forward.

## Capabilities

### New Capabilities
<!-- None: this extends the existing chapter catalog. -->

### Modified Capabilities
- `curriculum-chapters`: a curriculum's chapters can be authored, edited, archived, and reactivated from the curriculum record page, with a derived position and an archived lifecycle.

## Impact

- **Schema**: `curriculum_chapters` gains `archivedAt` (with the archived/active check used by the other catalogs) and its migration.
- **Services**: `reference/services.ts` gains chapter create, update, archive, and reactivate, and the chapter list returns archived state for the record page.
- **UI**: the curriculum record page gains a Chapters section with an add form and per-chapter edit and state actions; `curricula/actions.ts` gains the corresponding actions.
- **Class editor**: unchanged — it continues to offer a curriculum's active chapters.
- **Data**: no backfill; existing imported chapters remain active.
