## Why

Search and filter controls are styled identically to required data fields across the app, and in the class-creation wizard a search box and its select render as two separate uppercase-labeled fields, so staff cannot tell an optional filter from a required input. The wizard's Next action is also silently disabled when a step is incomplete, giving no indication of what is missing.

## What Changes

- Group each wizard inline filter with its select into a single labeled control: one label, a filter box and a select joined in one bordered container.
- Give search and filter boxes a distinct affordance — a leading magnifier icon, `type="search"`, and a consistent "Search …" placeholder — applied to the wizard filters and the page-level search bars.
- Introduce a dedicated search-field style rather than reusing `.search-input`, which is the app's generic input and textarea style.
- Mark required inputs with a signal-red asterisk after the label and show a small "* Required" legend at the top of each wizard step.
- Make the wizard's Next action identify missing required inputs — highlight them and stay on the step — instead of being silently disabled.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `class-creation-wizard`: advancing a step identifies missing required inputs instead of silently preventing advancement.

## Impact

- **UI**: `class-creation-wizard.tsx`, `fire-subject-fields.tsx`, a new shared search-select control, the page-level search bars (agencies, sites, students, training codes, classes list, reporting), and `globals.css` (search-field style, required markers, grouped control).
- **Behavior**: wizard step validation returns the missing inputs and the Next action highlights them.
- **No schema, API, or data changes; no breaking changes.**
