## 1. Baseline and classification

- [x] 1.1 Run the full integration suite and record the failing files and tests
- [x] 1.2 Confirm each failure's cause against current behavior (FFN, profile, MTU, isolation)
- [x] 1.3 Classify each failure as a stale test or a genuine defect, and note any genuine defect separately

## 2. Fire-class instructor FFN fixtures

- [x] 2.1 Add a shared helper that creates an instructor with a valid, run-unique FFN
- [x] 2.2 Use the helper in the `curriculum-chapters`, `database`, `digital-roster-signing`, `individual-training-notices`, `recent-curricula`, and `reporting-destinations` fixtures
- [x] 2.3 Re-run those files and confirm they pass

## 3. Instructor profile tests

- [x] 3.1 Align `instructor-profiles` expectations with the current validation and authorization order
- [x] 3.2 Fix the duplicate-FFN assertion
- [x] 3.3 Re-run the file and confirm it passes

## 4. MTU catalog tests

- [x] 4.1 Reconcile the seed-count expectation with the current catalog
- [x] 4.2 Make catalog-item fixtures run-unique so they cannot collide across files
- [x] 4.3 Re-run the file and confirm it passes

## 5. Determinism and isolation

- [x] 5.1 Audit remaining fixtures for non-unique values (FFN, phone, names, codes) and make them run-unique
- [x] 5.2 Ensure no test depends on rows another file created
- [x] 5.3 Confirm the suite has no cross-file unique-constraint collisions

## 6. Verification

- [x] 6.1 `db:reset:integration` followed by the full `test:integration` run is green
- [x] 6.2 Re-run twice and confirm identical results (no variance)
- [x] 6.3 `npm run verify` passes end to end

## 7. Continuous integration

- [x] 7.1 Confirm the CI integration job runs the reset and the suite
- [x] 7.2 Confirm the suite is green on CI
