## 1. Shared search controls and styles

- [x] 1.1 Add a shared `SearchSelect` control (one label, filter input, select in one bordered container; options as `{ value, label, group? }`; clears the filter on selection; shows a "No matches" hint)
- [x] 1.2 Add the `.search-field` style (leading magnifier icon, `type="search"`, consistent "Search …" placeholder) and the required-marker style (signal-red asterisk and legend)

## 2. Wizard conversion

- [x] 2.1 Replace the Fire subject training-code search and select with the grouped `SearchSelect`
- [x] 2.2 Replace the Fire subject curriculum search and select with the grouped `SearchSelect`
- [x] 2.3 Replace the training-site search and select with the grouped `SearchSelect`
- [x] 2.4 Mark required inputs with a signal-red asterisk and add the "* Required" legend to each wizard step

## 3. Next validation feedback

- [x] 3.1 Refactor wizard step validation to return the missing required input keys instead of a boolean
- [x] 3.2 Keep the Next control enabled and, on click, highlight the missing inputs with a step message and stay on the step
- [x] 3.3 Wire the error state into the subject row and class-step fields (`aria-invalid`, error border/label) and clear it when the step advances

## 4. Page-level search bars

- [x] 4.1 Migrate the genuine search inputs on the agencies, sites, students, training-codes, and classes list pages to the `.search-field` style (the reporting page has only date filters, not a search box, so it was left unchanged)

## 5. Verification

- [x] 5.1 Add unit tests for step validation returning the missing input keys per step
- [x] 5.2 Add an e2e test that choosing Next on an incomplete step highlights the missing inputs and does not advance, and that a grouped control selects a value
- [x] 5.3 Run `npm run check`, `npm run test`, and `npm run test:integration`
