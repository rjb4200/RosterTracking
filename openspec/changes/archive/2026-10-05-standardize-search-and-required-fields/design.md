## Context

See `proposal.md -- Why`. Current state that shapes the approach:

- The wizard pairs a search `<Input>` with a `<select>` for training code, curriculum, and training site. Both sit in `.field`, and `.field label` (globals.css) gives every label the same uppercase, steel, bold treatment, so an optional filter reads like a required field.
- `.search-input` is the app's generic input and textarea style (34 usages), so the page-level search bars cannot be visually distinguished from data fields without a new class.
- The wizard's Next action is `disabled={!validateStep(...)}`, so an incomplete step cannot be attempted and nothing identifies the missing input. The `class-creation-wizard` spec already requires the Fire step to "identify the missing field" when staff try to leave, which the disabled button does not satisfy.
- `components/ui` has no combobox primitive, which is why the search + select pair exists.

## Goals / Non-Goals

**Goals:**
- One labeled control per searchable catalog in the wizard, with the filter visibly subordinate to the select.
- A distinct, consistent search affordance everywhere a search box appears.
- Clear required markers and a Next action that explains what is missing.

**Non-Goals:**
- Renaming the widely used `.search-input` class.
- Changing the edit/review session form's plain Curriculum select (no search today).
- Replacing the filter with a full async combobox.
- Changing any validation rule; only how it is surfaced.

## Decisions

### Decision: A shared `SearchSelect` control for the wizard

Extract a small client component: one visible label, a filter input, and a select in a single bordered container with an inner divider. Options are `{ value, label, group? }[]` so it covers plain lists (training codes, curricula) and grouped lists (sites with "Recently used" / "All sites"). Alternatives considered: inline markup per usage (duplication) and a native `<datalist>` (cannot map a label back to an option id for the select). The component owns the filter state and clears it when a value is selected.

### Decision: A new `.search-field` style, not a change to `.search-input`

Add a dedicated class for genuine search boxes — leading magnifier icon (inline SVG), `type="search"`, and a consistent "Search …" placeholder — and migrate only the real search boxes (wizard filters and the page search bars) to it. `.search-input` stays the generic input/textarea style so the ~34 non-search usages are untouched. Renaming `.search-input` app-wide was rejected as unrelated churn.

### Decision: Required markers with an asterisk and a legend

Mark required labels with a signal-red `*` and show a small "* Required" legend at the top of each wizard step. This is conventional and gives the search filters a clear counterpart. Optional fields keep their explicit "(optional)" text.

### Decision: Next always attempts to advance and identifies missing inputs

Refactor step validation from a boolean into a function that returns the missing input keys. The Next control stays enabled (except while submitting); on click it validates, and when inputs are missing it keeps the step, marks those inputs with an error state (`aria-invalid`, error border/label), shows a short "Complete the highlighted fields" message, and does not advance. When valid it advances and clears the error state. This satisfies the existing "identify the missing field" scenario and extends the same behavior to the class-and-schedule step.

### Decision: Accessibility of the grouped control

The visible label targets the select; the filter input carries an `aria-label` ("Filter …"). Required markers include text for screen readers rather than relying on the asterisk alone, and highlighted inputs are announced through `aria-invalid` and the step message.

## Risks / Trade-offs

- Migrating page search bars touches several list pages → keep the change to swapping in the search class and icon, not restructuring those forms.
- Turning Next from disabled to always-enabled changes the wizard's feel → the error highlighting and message must be immediate and unambiguous.
- Refactoring validation could regress step gating → cover each step's required set with unit tests.
- Grouped control focus styling → use `:focus-within` on the container so the join stays visible while typing or selecting.

## Migration Plan

1. Add the `SearchSelect` component, the `.search-field` style, and required-marker styling.
2. Convert the three wizard filters and migrate the page search bars.
3. Refactor step validation and wire the Next error state.
4. Ship in one deploy; rollback by revert. No data or schema changes.
