## Why

The grouped search control narrows a select's options but the select keeps showing its placeholder until it is opened, so typing a category or curriculum appears to do nothing. Staff also read the "Book not listed" field label as jargon that does not match the surrounding Curriculum field.

## What Changes

- Auto-select the first matching option as staff type in a `SearchSelect` filter, for the Category, Curriculum, and Training site controls. When the filter matches nothing, keep the current selection.
- Rename the "Book not listed (optional)" field label to "Curriculum not listed (optional)".

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `class-creation-wizard`: filtering a search control selects the first matching option.

## Impact

- **UI**: `search-select.tsx` (auto-select on filter change); `fire-subject-fields.tsx` and `component-form.tsx` (field label).
- **Behavior**: the `SearchSelect` value updates as staff type, which also updates its dependents (training code prefills the class name; curriculum swaps the chapter suggestions).
- **No schema, API, or data changes; no breaking changes.**
