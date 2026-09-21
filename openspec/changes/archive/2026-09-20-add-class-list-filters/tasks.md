## 1. Class list query and scope

- [x] 1.1 Extend the class list read to select creation time, first and last session times, finalization time, and active attendance count, reusing the correlated-subquery pattern already used by the operational dashboard query.
- [x] 1.2 Apply the default scope in the query: drafts created within seven days, open, completed, and classes finalized within seven days, excluding cancelled classes.
- [x] 1.3 Add the unfinalized-with-students exemption so a class with active attendance that is not finalized is never excluded by the session window or the default status scope.
- [x] 1.4 Add validated filters for lifecycle status, session date range, include-finalized, and include-cancelled, while keeping the existing course and site search.
- [x] 1.5 Compute an overdue flag for list rows using the existing overdue helper so the list and dashboards agree on what is overdue.
- [x] 1.6 Handle the row cap so a widened list cannot silently truncate, either by raising the cap or by reporting truncation.

## 2. Class list page and filters

- [x] 2.1 Read and validate the filter search parameters, falling back to defaults for unknown values, and pass them to the query.
- [x] 2.2 Build the filter bar with status, session date range, inclusion toggles, and search, preserving the current selections after submission.
- [x] 2.3 Render the active list and a separate recently finalized section, each with an appropriate empty state.

## 3. Status presentation

- [x] 3.1 Add success, warning, and info theme tokens with light and dark values alongside the existing palette.
- [x] 3.2 Extend the badge component with the new tone variants.
- [x] 3.3 Apply the lifecycle tone mapping: draft neutral, open info, completed warning, finalized success, cancelled muted.
- [x] 3.4 Add the colored left rail on list rows and show overdue as a separate marker beside, not instead of, the lifecycle status.
- [x] 3.5 Verify contrast in both themes and confirm the written lifecycle state remains present in every case.

## 4. Verification

- [x] 4.1 Add integration coverage for the default scope, filter widening, stale-draft exclusion, and the unfinalized-with-students exemption.
- [x] 4.2 Add E2E coverage for the default list, widening filters to reveal hidden classes, the recently finalized section, and the status and overdue indicators.
- [x] 4.3 Run migration, lint, typecheck, unit and integration tests, relevant E2E tests, build, and strict OpenSpec validation.
