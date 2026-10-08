## Context

See proposal.md — Why. Current facts that shape the approach:

1. **The KFS-1A subject cells are single-line auto-size fields.** `CurriculumRow1/2`, `Class NameRow1/2`, and `Lesson PlanRow1/2` each have `Ff=0` (not multiline) and a default appearance of `/Helv 0 Tf` (font size 0 = auto-size). Their widgets are roughly 101–106pt wide and 14pt tall.
2. **The renderer never sets a font size.** `setText` writes only the value (`service.ts:250`), and `renderPage` calls `updateFieldAppearances` with Helvetica (`service.ts:426`). pdf-lib then auto-sizes the text, shrinking a single line until it fits the cell width — as low as ~3pt for a full `<book> - <chapter>` label.
3. **`typography.fontSize: 8` in `mappings.ts` is unused.** Short cells therefore render ~10pt and long ones ~3pt; sizes are inconsistent and the declared value has no effect.
4. **The templates are checksum-pinned.** `service.test.ts` asserts a SHA-256 per asset, so the approved PDFs must not be edited.

## Goals / Non-Goals

**Goals:**
- Long Class Name, Curriculum, and Lesson Plan values in KFS-1A subject rows render legibly across up to two lines.
- Short values render exactly as they do today.
- No change to approved template assets, their checksums, field mappings, or populated fields.

**Non-Goals:**
- No change to KBEMS-E16, completion certificates, or any non-subject KFS-1A field.
- No truncation or omission of curriculum/chapter content.
- No redesign of the KFS-1A subject grid or the approved form.

## Decisions

**D1 — Enable multiline on the three subject fields at render time, in memory.** Call `enableMultiline()` on the Curriculum, Class Name, and Lesson Plan fields after loading the template and before `updateFieldAppearances`. The approved asset and its checksum stay untouched, and no other field or form is affected.
- *Alternatives:* edit the template's `Ff` flags (breaks the checksum assertion and mutates an approved form); pre-wrap the value with manual newlines (fragile, and pdf-lib would still auto-size each line).

**D2 — Keep pdf-lib's auto-size; do not pin a font size.** With the field multiline, pdf-lib wraps by word and picks the largest size that fits both the cell width and height. This guarantees the value always fits the cell.
- *Alternatives:* pin the declared 8pt (long values would overflow or clip); set a manual minimum floor (still overflows). Wrapping at the largest fitting size is the safest behavior for a fixed-size official form.

**D3 — Scope to the KFS-1A subject rows only.** Curriculum, Class Name, and Lesson Plan all share the same narrow-cell, single-line risk and are populated from finalized facts. Applying it only to Curriculum would leave the same illegibility on long class names and lesson plans.
- *Alternatives:* all KFS-1A text fields (the header/attendee fields are wide enough; changing them adds churn for no gain); all forms (KBEMS-E16's objectives field is already multiline and the rest is fine).

**D4 — Declare wrapping in the mapping.** Add a per-field wrapping flag to the KFS-1A `TemplateMapping` and enable multiline from it, so which cells wrap is data, not a hardcoded name list in `fillKfsPage`.
- *Alternatives:* hardcode the three field names in the renderer (works, but hides the intent and drifts from the mapping-driven design).

**D5 — Wrap rather than truncate.** The spec requires the full `<book> - <chapter>` label; wrapping preserves it. Truncating with an ellipsis would keep a larger size but drop required content.
- *Alternatives:* truncate to one line at a fixed size (violates the curriculum requirement); shorten the printed label (changes the requirement, a product decision outside this change).

## Risks / Trade-offs

- [Two lines still cap at ~5–6pt for a full book+chapter label] → the cell is ~104 × 12pt, so two lines roughly double capacity versus one; values that need a third line auto-size back down and remain small. Acceptable improvement without changing the approved form.
- [Multiline changes vertical placement of already-short values] → short values still lay out on one line; confirm with a visual check that their position matches today.
- [The unused `typography.fontSize` stays dead config] → out of scope to remove here; note it so a future change can either wire it or delete it.
- [Deterministic output] → enabling multiline is deterministic and the template bytes are unchanged, so the reproducibility and checksum tests should continue to hold.

## Migration Plan

No database migration and no template asset change. Deploy the renderer with the release; rollback is reverting the commit.

## Open Questions

None blocking.
