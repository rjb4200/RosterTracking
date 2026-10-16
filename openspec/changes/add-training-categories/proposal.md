## Why

EMS classes have no structured category today: staff type the EMS course name free-hand, so the same course lands in reports and state audits as `TRAUMA`, `trauma`, and `Head trauma`. Fire classes already avoid this by picking a Category (a training code) on creation. Extending the training-code catalog into a two-kind **training categories** catalog — Fire and EMS — lets an EMS class select a category that fills the course name *and* persists a stable value that reports and audits can group on.

## What Changes

- Extend the existing `training_codes` catalog into **training categories** with a `kind` of `fire` or `ems`; existing rows become `fire`. The table and `/staff/training-codes` route are retained (no rename).
- Add an EMS category list, seeded directly now. The five core categories (`Airway`, `Cardiology`, `Medical`, `Operations`, `Trauma`) are seeded **pinned** and sit above a separator in the pickers; the remaining courses follow alphabetically. Staff can pin or unpin any category, Fire or EMS, from its record form.
- The `/staff/training-codes` screen presents two sections, **Fire first, then EMS**, and is relabelled "Training categories". New/edited records carry a Fire/EMS selector so staff can add, edit, deactivate, reactivate, and archive EMS categories the same way as Fire codes.
- The record form lets staff **pin a category to the top** and **map a category to its counterpart** of the other kind; the mapping is symmetric.
- Split the two pickers: the Fire roster step offers only Fire categories, and the KBEMS step offers only EMS categories. FD codes never appear on the EMS side and vice-versa.
- Give the KBEMS step a required **Category** selector that fills the EMS Course Name (kept editable), mirroring how the Fire Category fills the Class Name. The class stores the selected category as a structured reference for reporting.
- Support a symmetric mapping between matching Fire and EMS categories, so a dual Fire + KBEMS class pre-fills the EMS Category from the first Fire subject.
- Seed the corrected, full-name EMS list (TCCC military courses excluded; CPR-HCP and ACLS are separate; IS-200 and IS-700.B are distinct rows).

## Capabilities

### New Capabilities
- `training-categories`: a single selectable category catalog split into Fire and EMS kinds, seeded with the EMS list, cross-kind mapped, pinnable above a separator, ordered pinned-then-alphabetically, and maintained (add/edit/archive) from one screen.

### Modified Capabilities
- `reference-catalog-management`: the training-code catalog becomes a two-section (Fire then EMS) "Training categories" screen and its record form gains a Fire/EMS kind selector, a pin control, and a mapping control.
- `reference-data-lifecycle`: a training category's identity and its revive/reactivate behavior account for its kind.
- `class-creation-wizard`: the Fire Category is drawn only from Fire categories; the KBEMS step gains a required EMS Category that fills the editable EMS Course Name, and a matching Fire selection pre-fills it on dual classes.
- `course-catalog`: the training-code catalog is no longer Fire-only; it carries both Fire and EMS category kinds while staying distinct from curricula.

## Impact

- **Schema/migrations:** `training_codes` gains `kind`, `group`, `sort_order`, and `maps_to_id` (self-reference); `training_classes` gains an EMS category reference. Existing rows backfill to `kind = 'fire'`.
- **Reference module:** services, the reference seed/import, and validation handle `kind` and ordering; the `import:training-codes` retire-the-rest rule is scoped per kind.
- **Staff UI:** `/staff/training-codes` list (sections), new/record pages (kind selector), and the class-creation wizard (KBEMS Category, prepopulation) plus the class-detail component Category picker.
- **Outputs that read the category:** official roster PDFs, individual training notices, completion certificates, and reports can consume the structured EMS category; rendering changes there are a follow-up, not part of this change.
- **Tests:** integration and e2e coverage for the new sections, filtering, mapping, and prepopulation.
