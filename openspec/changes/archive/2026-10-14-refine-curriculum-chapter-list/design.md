## Context

See `proposal.md` — Why. Current state that shapes the approach:

- `curriculum_chapters` already has `isActive` and `archivedAt`, unique on `(curriculumId, part, number)`, and a check that an archived row is inactive. No schema change is needed.
- `archiveCurriculumChapter` / `reactivateCurriculumChapter` already work; the problem is presentation.
- `listCurriculumChaptersForAdmin` returns active **and** archived chapters, ordered by `part`, `position`, `number`. The record page renders every row in that order, so archived chapters stay in place and a blank section (`part = ""`) sorts to the top.
- The import (`reference-provision.ts`) assigns `position` from the chapter's array index across the whole book, so `position` already encodes book order for imported catalogs. Manual authoring derives `position` from the number's leading integer.
- `listCurriculumChapters` (the class Fire-subject selector) filters `isActive` and orders by `curriculumId, position`; it already excludes archived chapters.

## Goals / Non-Goals

**Goals:**
- Hidden-by-default archived chapters on the curriculum record page, with a way to reveal and reactivate them.
- Book-order chapter list: sections as they occur in the catalog, chapters numeric within a section, unsectioned chapters last.
- Keep the change read-and-presentation only.

**Non-Goals:**
- No hard delete (archive stays the reversible removal).
- No change to the class Fire-subject chapter selector.
- No schema change and no change to position derivation.
- No drag-and-drop or manual reordering.

## Decisions

### D1 — Archived chapters are hidden behind a collapsed disclosure, not deleted

The record page lists active chapters in the main list and renders archived chapters inside a collapsed `<details>` ("Archived chapters (n)") with a Reactivate button.

- **Why**: "remove from sight" without losing the record; a hard delete would collide with the unique `(curriculum, part, number)` index and discard provenance for finalized rosters.
- **Alternatives**: hard delete (lossy, collides on re-add); a toggle filter (more UI than the case needs).

### D2 — Book order is derived from the chapters, computed in code

A curriculum has few chapters, so the record page reads its chapters once and orders them in application code rather than in SQL:

1. Sort all chapters by `position`, then `number`, then `id` (stable base order).
2. Assign each section its order from the first time it appears in that base order; sections therefore appear in catalog order (for imported catalogs, `position` is the import index, so this is book order).
3. Emit sectioned chapters grouped by section order (base order within each), then unsectioned chapters in base order.

- **Why**: "section order" is a first-appearance property that SQL cannot express cleanly without a new column, and the dataset is tiny.
- **Alternatives**: order by `part` text (current; alphabetizes sections and floats blank first); add a `sectionPosition` column (schema churn for a display concern).

### D3 — The ordering lives in one exported, unit-testable helper

Add a pure `orderChaptersInBookOrder(rows)` helper (a sibling of the chapter services) that both the active list and the archived disclosure use, with a unit test. `listCurriculumChaptersForAdmin` keeps returning every chapter (including archived) so the disclosure can render them, ordered by `position, number` as the base.

- **Why**: ordering is the part most likely to regress; a pure function is cheap to test and keeps the page presentational.
- **Alternatives**: sort inline in the page (untested); change the SQL (cannot express first-appearance sections).

### D4 — The class selector is unchanged

`listCurriculumChapters` stays as-is (active only, `curriculumId, position`). Only the admin record page changes.

- **Why**: the user reported the record page; the selector already excludes archived chapters and carries its own ordering contract.

### D5 — Archiving never affects classes or finalized rosters, and re-adding is never blocked

A class stores the chapter as a plain-text value on `class_components.curriculum_chapter`; it is not a foreign key to `curriculum_chapters`. Finalization copies that value into the immutable `finalization_revisions.encrypted_snapshot`. Past rosters therefore read the snapshot, never the live catalog, so archiving or hiding a chapter cannot alter them. Because the unique index is on `(curriculumId, part, number)` regardless of archive state, re-authoring the same section and number reactivates the archived row (see the existing `createCurriculumChapter` revive branch), so a previously used number is never blocked.

- **Why**: the user needs a mistyped chapter gone from the list without losing the ability to add that number again, and without any change to rosters already taught.
- **Alternatives**: a hard delete (would break revive-on-re-add and lose provenance); making `curriculumChapter` a foreign key (would couple historical rosters to catalog edits — rejected).

## Risks / Trade-offs

- **Manually authored multi-section books** may tie on first-appearance position (each section restarting at 1) → tiebreak by section name for a deterministic order.
- **Staff who archived a chapter look for it**: it is now one click away in the collapsed disclosure → keep the disclosure label explicit ("Archived chapters").
- **Existing archived chapters disappear from the default view** → intended, and reversible via reactivate.
- **No data migration**: the base ordering reads existing `position`/`number`; no backfill.

## Migration Plan

1. Add `orderChaptersInBookOrder` and a unit test.
2. Partition active vs archived on the curriculum record page; render active in book order and archived in a collapsed disclosure.
3. Extend the integration test for ordering and the active/archived split.
4. **Rollback**: revert the commit; no schema or data change.
