## Context

See `proposal.md -- Why`. Current state that shapes the approach:

- The Fire subject row (`fire-subject-fields.tsx`) renders a Curriculum `SearchSelect` and a separate "Curriculum not listed (optional)" `Input`. Each one's `onChange` clears the other, so they are already mutually exclusive — but as two stacked fields they read as "fill both".
- The edit/review session form (`component-form.tsx`) has the same pair built on a plain `<select>` and its own `curriculumId`/`curriculumName` state.
- `SearchSelect` supports grouped options, a filter, first-match auto-select, and a controlled value. It renders one `.field` containing the label and the joined filter/select container.
- `class_components.curriculum_id` (FK) and `curriculum_name` (text) are independent nullable columns; `composeCurriculumLabel` prefers the typed name for display.

## Goals / Non-Goals

**Goals:**
- Present the approved selection and the not-listed name as one either/or control.
- Use the same control in the wizard row and the edit/review session form.

**Non-Goals:**
- Changing how a curriculum is stored, validated, or printed.
- Changing the chapter behavior (chapters still come from the selected approved curriculum).
- Adding a not-listed path for training codes.

## Decisions

### Decision: A shared `CurriculumSelect` wrapping `SearchSelect`

`CurriculumSelect` owns the either/or rule. It renders a `SearchSelect` whose options are the curriculum options plus a final "Not listed (type one)" option. Choosing that option clears `curriculumId` and reveals a free-text `Input` bound to `curriculumName`; choosing an approved option clears `curriculumName` and hides the input. The row and the session form pass `curriculumId`/`curriculumName` and receive both back through one `onChange`.

### Decision: Two small, generic additions to `SearchSelect`

- A `footer` node rendered inside the control's `.field` after the container, so the revealed name input sits visually under the select.
- A `pinned` flag on an option so the not-listed option is always shown but is excluded from filter matching and first-match auto-select.

Both stay optional and generic; `SearchSelect` remains unaware of "curriculum".

### Decision: The edit/review form adopts the same control

`component-form.tsx` replaces its plain `<select>` and optional `Input` with `CurriculumSelect`, gaining search and the recently-used group. It gains a `recentCurriculumIds` prop, which the edit and review pages pass from `listClassFormOptions`.

### Decision: Keep the data and print rules

Only `curriculumId` or `curriculumName` is ever set by the UI, and `composeCurriculumLabel` is unchanged. Older revisions that somehow hold both still print the typed name.

### Decision: Trim before switching modes

The not-listed name is only treated as present when it has non-whitespace text, so a stray space does not read as a typed curriculum.

## Risks / Trade-offs

- `SearchSelect` grows a `footer` slot and a `pinned` flag → both optional and generic.
- The edit/review form gains search and recently-used → a visible change there, accepted for consistency.
- Existing revisions that predate the control still render via `composeCurriculumLabel`.

## Migration Plan

None. Pure UI; rollback by revert. No schema or data changes.
