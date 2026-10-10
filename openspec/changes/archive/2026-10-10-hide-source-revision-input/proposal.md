## Why

`source_revision` is import provenance: it exists so the reference imports can upsert and keep multiple revisions of a source dataset apart. Admins authoring curricula, training codes, and chapters by hand are asked to type it, which is confusing and easy to get wrong (a mistyped value creates a near-duplicate). Admin authoring now replaces the imports, so the field should stop appearing in the admin UI while the column stays for the legacy imports and their identity.

## What Changes

- Remove the **source-revision input** from the curriculum, training-code, and chapter admin forms, and remove it from the catalog lists that display it.
- **Default `source_revision` to `manual`** when a record is created or edited through the admin.
- Keep the `source_revision` **columns**, their unique indexes, and the import scripts unchanged (legacy).
- Note that admin-authored records share the `manual` value, so their effective uniqueness collapses to the remaining identity (curriculum publisher + program title; training code) — a near-duplicate is now rejected rather than silently created.

## Capabilities

### New Capabilities
<!-- None: this simplifies the existing admin forms. -->

### Modified Capabilities
- `reference-catalog-management`: the curriculum and training-code forms and lists do not surface a source revision; it defaults to `manual`.
- `curriculum-chapters`: chapter authoring does not capture a source revision; the stored value defaults to `manual`.

## Impact

- **Forms**: `curriculum-form.tsx`, `training-code-form.tsx`, and `curriculum-chapter-form.tsx` drop the source-revision field.
- **Lists**: the curricula and training-codes lists drop the source-revision column.
- **Actions/services**: `reference/services.ts` create/update for curricula, training codes, and chapters default the source revision to `manual`, and their input schemas no longer require it.
- **Data**: no migration; existing values are retained. Imports and their upsert identity are unchanged.
- **Tests/docs**: update the reference-create tests and the reference-data docs.
