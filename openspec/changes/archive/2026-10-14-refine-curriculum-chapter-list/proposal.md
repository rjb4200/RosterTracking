## Why

Staff cannot get a mistyped or unneeded curriculum chapter out of the way: archiving sets a chapter inactive but the curriculum record page still lists it in place, so it stays in sight. The same list also orders sections alphabetically (and floats a blank section to the very top), so added chapters do not appear in the book's own order.

## What Changes

- Hide archived chapters from the curriculum record page's main chapter list. Show them behind a collapsed "Archived chapters" disclosure with a Reactivate action, so a chapter is out of sight but recoverable.
- Order the chapter list by book order: sections appear in catalog order (derived from the chapters' positions), chapters are ordered numerically within their section, and unsectioned chapters are listed last instead of first.
- Keep the class Fire-subject chapter selector unchanged: it already offers active chapters only.
- Preserve two guarantees: re-adding an archived chapter's section and number is never blocked (the archived row reactivates), and archiving a chapter never changes a class that recorded it or a finalized roster (the class stores the chapter value and finalization snapshots it).

## Capabilities

### New Capabilities

<!-- None. -->

### Modified Capabilities

- `curriculum-chapters`: The "A curriculum's chapters are managed from its record page" requirement changes so that archived chapters are hidden from the default list and the list is ordered by book order rather than by section name.

## Impact

- `src/modules/reference/services.ts` — chapter admin read (ordering, active/archived separation).
- `src/app/staff/(protected)/curricula/[id]/page.tsx` — render active chapters and an "Archived chapters" disclosure.
- `tests/integration/curriculum-chapters.test.ts` — cover ordering and the archived/active split.
- No schema change: `archivedAt` and `isActive` already exist on `curriculum_chapters`.
- No change to the class chapter selector or to finalized rosters (chapters print from the finalization snapshot).
