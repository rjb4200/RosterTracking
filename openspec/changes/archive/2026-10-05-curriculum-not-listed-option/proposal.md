## Why

The Fire subject row shows "Curriculum" and "Curriculum not listed" as two parallel fields, so it reads as though both should be filled. They are actually mutually exclusive, but nothing in the form says so.

## What Changes

- Fold the not-listed path into the Curriculum control: a "Not listed (type one)" option reveals a free-text curriculum name, and choosing an approved curriculum hides it.
- Use one shared `CurriculumSelect` control in the wizard's Fire subject row and the edit/review session form, so the session form gains the same searchable, recently-used Curriculum control.
- Enforce the either/or rule in one place: choosing an approved curriculum clears a typed name, and choosing the not-listed option clears an approved selection.
- Exclude the not-listed option from the first-match auto-select.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `class-creation-wizard`: the Fire subject Curriculum control is an either/or choice.

## Impact

- **UI**: a new `CurriculumSelect` component (wrapping `SearchSelect`); `fire-subject-fields.tsx` and `component-form.tsx` adopt it; the edit and review pages pass `recentCurriculumIds` to the component form.
- **No schema, API, or data changes; no breaking changes.**
