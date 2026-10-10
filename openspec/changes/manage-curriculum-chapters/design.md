## Context

See `proposal.md` — Why. Current state that shapes the approach:

- `curriculum_chapters`: `curriculumId`, `part` (section, `""` = none), `number`, `title`, `position`, `sourceRevision` (required), `isActive`, timestamps. Unique on `(curriculumId, part, number)`. No `archivedAt`.
- Chapters enter the catalog only through `importCurriculumChapters`, invoked by `scripts/import-curriculum-chapters.ts` from a checked-in JSON. The import sets `position` from the array index.
- `listCurriculumChapters` filters `isActive` and orders by `curriculumId, position`; the class Fire-subject chapter selector consumes it.
- The curriculum admin (`/staff/curricula`, `[id]`) uses the shared reference pattern (record page edit + deactivate/reactivate/archive) and is gated by `CURRICULA_MANAGE`.
- Other reference catalogs use `archivedAt` + `isActive` with a check constraint, and revive an archived record when it is re-added (`reference-data-lifecycle`).

## Goals / Non-Goals

**Goals:**
- Author and maintain chapters on the curriculum record page.
- Derive position from the number; order by section then position.
- Add an archived lifecycle for parity.
- Make the catalog admin-owned; keep the import code but stop relying on it.

**Non-Goals:**
- Not removing the import script.
- Not changing the class chapter selector beyond hiding archived chapters.
- No drag-and-drop reordering (position is derived).

## Decisions

### D1 — A Chapters section on the curriculum record page

List the curriculum's chapters (section → position) with an add form and per-chapter Edit + Archive/Reactivate, alongside the existing curriculum edit form.

- **Why**: a chapter is a sub-record of a curriculum; the record page is where the curriculum is maintained.
- **Alternatives**: a nested page per chapter (more navigation for a small record); a separate chapters catalog (breaks the parent relationship).

### D2 — Author section, number, title, and source revision

Editable fields are the section, number, and title; the source revision is also entered on the add form and defaults to `manual` when blank.

- **Why**: the user wants the source revision captured on authoring now that the catalog is admin-owned.
- **Alternatives**: drop source revision (loses provenance); derive it (nothing to derive from).

### D3 — Position is derived from the number

When the number begins with an integer (`"3"`, `"3.1"`, `"12 - Hose"`), the position is that integer; otherwise the chapter is appended (maximum position in the curriculum plus one). The list orders by `part`, then `position`, then `number` as a tiebreak.

- **Why**: staff enter numbers, not ordering; deriving keeps the list sensible without a reorder UI.
- **Alternatives**: an editable position field (extra UI, easy to desync from the number); derive from the whole string only (fails for "3.1" and "Appendix A").

### D4 — Chapters gain an archived state

Add `archivedAt` to `curriculum_chapters` with the same check used elsewhere (`archivedAt is null or not isActive`). Archived chapters stay in the curated list with a state action and are excluded from the class chapter selector (which reads active rows).

- **Why**: parity with the other catalogs and a reversible alternative to deletion; historical rosters are unaffected because the chapter is printed from the finalization snapshot.
- **Alternatives**: hard delete (lossy, and a re-add can collide with an archived row anyway); deactivate-only (no distinct archived concept).

### D5 — Re-add revives an archived chapter

Because `(curriculum, part, number)` is unique, authoring a chapter that matches an archived chapter reactivates it; matching an active chapter is a validation error reported to staff.

- **Why**: consistent with the revive-on-re-add behavior of the other catalogs and avoids "duplicate" surprises.
- **Alternatives**: always error on any match (staff must manually reactivate); allow duplicates (impossible under the unique index).

### D6 — The record page lists archived chapters; the selector does not

The curriculum record page reads chapters including archived ones (to reactivate); the class chapter selector continues to read active chapters only.

- **Why**: staff need to see and restore archived chapters; the class editor must not offer them.

### D7 — Access mirrors the curriculum editor

Chapter actions require `CURRICULA_MANAGE`.

### D8 — The import is superseded, not removed

Leave `importCurriculumChapters` and its script in place; document that the catalog is admin-owned and the import is legacy.

- **Why**: the user chose to keep it; removal is a separate concern.

## Risks / Trade-offs

- **Re-running the import** can still overwrite or revive hand edits (unique upsert). Accepted per the decision; noted in docs.
- **Position collisions** (two numeric chapters with the same leading integer) → resolved by the number tiebreak; harmless.
- **Editing a number or section into an existing active chapter** → the unique index rejects it; surface a friendly conflict error.
- **Schema change** → adding a nullable `archivedAt` with a check is additive and safe.

## Migration Plan

1. Add `archivedAt` to `curriculum_chapters` with the archived/active check; generate the migration (no backfill).
2. Add chapter create, update, archive, and reactivate to `reference/services.ts`, with derived position and revive-on-re-add.
3. Add a chapter read for the record page that includes archived chapters.
4. Add the Chapters section, forms, and state actions to the curriculum record page and `curricula/actions.ts`.
5. Update tests and docs.
6. **Rollback**: revert the commit; the added column is nullable and the actions are additive.

## Open Questions

- None that change the approach; the exact leading-integer parse rule for numbers like `"3.1"` can be tuned.
