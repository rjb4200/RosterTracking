## Context

See `proposal.md -- Why`. Current state that shapes the approach:

- `SearchSelect` (`search-select.tsx`) joins a filter input and a native `<select>`. Typing narrows the select's options, but a native select keeps showing its current value until it is opened, so there is no visible feedback while typing.
- Before the grouped control existed, the Fire subject search auto-selected the first match and prefilled the class name. This change restores that behavior inside `SearchSelect`.
- The field labelled "Book not listed (optional)" is the free-text `curriculumName` input in `fire-subject-fields.tsx` and `component-form.tsx`.

## Goals / Non-Goals

**Goals:**
- Give immediate feedback by selecting the first match as staff type.
- Use clearer, consistent wording for the unlisted-curriculum field.

**Non-Goals:**
- Replacing the native select with a custom listbox.
- Changing option ordering or the recency grouping for sites.
- Rewording the "book" terminology in specs and code comments.

## Decisions

### Decision: Auto-select the first match in `SearchSelect`

On filter change, compute matches from the full option list. When there is at least one match and the first is not already selected, call `onChange` with it. An empty filter performs no auto-selection, and a filter with no matches keeps the current selection. This lives entirely in `SearchSelect`, so every instance (Category, Curriculum, Training site) behaves the same.

### Decision: Keep the typed filter after an auto-selection

Auto-selection calls `onChange` directly and leaves the filter text in place so staff can keep refining. The existing behavior of clearing the filter when a value is explicitly picked from the select is unchanged.

### Decision: First match follows rendered order

For grouped options (Training site: "Recently used" then "All sites"), the first match is the first in rendered order. This is accepted because the option order already encodes recency; changing the grouping is out of scope.

### Decision: Rename the label only

Change the visible label to "Curriculum not listed (optional)" in both forms. The stored field stays `curriculumName`, and spec/design terminology is left unchanged.

## Risks / Trade-offs

- Auto-selection can pick an option the staff member did not intend while typing → they continue typing to refine, matching the previous behavior.
- Selecting a curriculum or training code updates dependents live (class name, chapter suggestions) → intended and previously the behavior.
- UI now says "curriculum" while specs say "book" → acceptable terminology drift; aligning the specs is a separate, optional cleanup.

## Migration Plan

1. Add the auto-select behavior to `SearchSelect`.
2. Rename the two labels.
3. Ship in one deploy; rollback by revert. No data or schema changes.
