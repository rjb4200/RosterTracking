## Why

Long values in the KFS-1A subject cells — especially the Curriculum cell, which now prints `<book> - <chapter>` — are squeezed onto a single line by the template's auto-size text fields. A full curriculum label drops to roughly 3pt, so the printed roster is hard to read.

## What Changes

- The KFS-1A renderer wraps the Curriculum, Class Name, and Lesson Plan cell values across up to two lines so long values render at a larger size instead of shrinking onto one line.
- Wrapping is applied only to the KFS-1A subject rows. Short values keep their current appearance, and KBEMS-E16 is unchanged.
- The approved PDF templates are not modified; wrapping is enabled on the in-memory form when a roster is rendered, so template assets and checksums are untouched.
- No change to finalized facts, field mappings, or the set of populated fields.

## Capabilities

### New Capabilities
<!-- None: this change refines existing behavior. -->

### Modified Capabilities
- `official-roster-pdfs`: the KFS-1A subject rows render long Curriculum, Class Name, and Lesson Plan values across two lines rather than a single auto-shrunk line.

## Impact

- Renderer: `src/modules/official-roster-pdfs/service.ts` (subject-row population in `fillKfsPage` and the appearance step in `renderPage`).
- Mapping metadata: `src/modules/official-roster-pdfs/mappings.ts` if a per-field wrapping flag is added.
- Tests: `src/modules/official-roster-pdfs/service.test.ts` (rendered-size expectations) and any renderer fixtures.
- No database schema change, no template asset change, no change to other documents.
