## Context

See `proposal.md` — Why. Current state that shapes the approach:

- `source_revision` is `not null` on `curricula`, `training_codes`, and `curriculum_chapters`.
- It is part of the identity for curricula (`unique(publisher, program_title, source_revision)`) and training codes (`unique(code, source_revision)`); for chapters it is plain metadata.
- The import scripts still upsert on that identity (`importCurricula`, `importTrainingCodes`, `importCurriculumChapters`), so the column is retained.
- Admin forms surface it (`curriculum-form.tsx`, `training-code-form.tsx`, `curriculum-chapter-form.tsx`) and the curricula/training-code lists show it.
- The write schemas require it for curricula and training codes (`min(1)`) and accept an optional value defaulting to `""` for chapters.

## Goals / Non-Goals

**Goals:**
- Stop asking admins for a source revision in any of the three catalogs.
- Default it to `manual` for admin-authored records.
- Keep the columns, their unique indexes, and the imports untouched.

**Non-Goals:**
- Not dropping the column or changing the import identity.
- Not retiring the import scripts.
- Not changing how the value is displayed anywhere other than the admin forms and lists.

## Decisions

### D1 — Hide the field, default in the service

Remove the source-revision input from the three forms and default the value to `manual` where the record is written (services), not in the form.

- **Why**: the default belongs with persistence; the form has no business inventing a value.
- **Alternatives**: a hidden input carrying `manual` (leaks the concept into the UI); an optional field with a placeholder (still asks).

### D2 — Relax the write schemas

The curricula and training-code write schemas make the source revision optional and default it to `manual`.

- **Why**: the column is `not null`, so the service must supply a value; making it optional removes the requirement from the caller.
- **Alternatives**: keep it required internally and pass `manual` from the action (spreads the constant).

### D3 — Remove the source-revision column from the lists

The curricula and training-codes lists stop showing a source-revision column.

- **Why**: the user asked to stop surfacing it to admins; a list column is the same concept.
- **Alternatives**: keep it read-only (still asks "what is this?").

### D4 — Keep columns, indexes, and imports

No schema change and no import change.

- **Why**: the imports still rely on the value for their upsert identity; the admin becoming the entry path doesn't invalidate the legacy import.

### D5 — The near-duplicate nuance

Admin-authored records all share `manual`, so their effective uniqueness collapses to the remaining identity (curriculum publisher + program title; training code). A duplicate is now rejected by the unique index rather than silently created. A residual case remains: an imported row with a non-`manual` revision and a new `manual` row for the same identity can still coexist.

- **Why**: worth stating so the behavior is understood; the residual case is a legacy-only edge.

## Risks / Trade-offs

- **Mixed catalog** → imported rows keep their revision, admin rows are `manual`; uniqueness stays per identity, so behavior is predictable.
- **List change** → removing the column is cosmetic; no data effect.
- **Tests** → any test that supplied a source revision to create a curriculum or training code must stop doing so; add an assertion for the `manual` default.

## Migration Plan

1. Relax the curricula and training-code write schemas; default the source revision to `manual`.
2. Default the chapter write schema to `manual` and drop the field from its form.
3. Remove the source-revision field from the three forms and the column from the two lists; simplify the actions.
4. Update tests and the reference-data docs.
5. **Rollback**: revert the commit; no schema change.

## Open Questions

- None that change the approach.
