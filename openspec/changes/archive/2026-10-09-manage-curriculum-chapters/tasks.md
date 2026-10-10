## 1. Schema

- [x] 1.1 Add `archivedAt` to `curriculumChapters` with the archived/active check used by the other catalogs, and generate the migration

## 2. Services

- [x] 2.1 Add chapter create and update that capture section, number, title, and source revision, default the source revision to `manual`, and derive the position from the number (leading integer, else append)
- [x] 2.2 Reject authoring a chapter whose section and number match an active chapter, and revive an archived chapter when its section and number match
- [x] 2.3 Add chapter archive and reactivate
- [x] 2.4 Add a chapter read for the curriculum record page that includes archived chapters (the class selector keeps reading active only)

## 3. Curriculum page

- [x] 3.1 Add a Chapters section to the curriculum record page listing chapters by section then position with their archived state, an add form (section, number, title, source revision), a per-chapter edit form, and archive/reactivate actions
- [x] 3.2 Add the chapter actions to `curricula/actions.ts`, gated by `CURRICULA_MANAGE`

## 4. Tests and verification

- [x] 4.1 Test create, edit, archive, reactivate, derived position, the duplicate-active error, and revive-on-re-add
- [x] 4.2 Run `npm run check`, `npm run test`, the touched integration tests, and `npm run build`

## 5. Docs

- [x] 5.1 Document that the chapter catalog is admin-owned and the import is legacy
