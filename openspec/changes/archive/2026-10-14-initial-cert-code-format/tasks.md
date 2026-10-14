## 1. Initial-certification settings store

- [x] 1.1 Add an application settings table (key text primary key, value text) in a new additive migration.
- [x] 1.2 Add a settings service that reads `initial_cert.tei`, returning `126` when the row is absent.
- [x] 1.3 Add a setter for the TEI that refuses the change unless the actor is an administrator.

## 2. Reporting page TEI control

- [x] 2.1 Render a subdued TEI edit form on the Reporting page, shown only when the viewer is an administrator.
- [x] 2.2 Add a server action that re-checks administrator, stores the TEI, and revalidates the Reporting page.

## 3. Class-creation options

- [x] 3.1 Add `defaultTeiNumber` to `ClassCreationOptions` and populate it from the settings service (`src/modules/classes/services.ts`).
- [x] 3.2 Add `recentInitialCertNumbers` to `ClassCreationOptions`: distinct non-empty `course_number` where `course_type = 'initial_certification'`, most recently used first, limited to five.
- [x] 3.3 Pass the new options from the class-creation page into the wizard.

## 4. Wizard KBEMS step

- [x] 4.1 Add an initial-cert format helper that trims and uppercases a value and tests it against `<TEI>-\d{2}-\d{2}-[RBAP]` for the configured TEI.
- [x] 4.2 Guard the Fire prefill effect (`class-creation-wizard.tsx:217-234`) with `courseType !== "initial_certification"`.
- [x] 4.3 Render the course number for Initial certification as a select-or-type control (SearchSelect with a pinned "type a new number" option) fed by `recentInitialCertNumbers`.
- [x] 4.4 On advancing the KBEMS step with a non-empty malformed initial-cert number, open the acknowledgement dialog and advance only after acknowledgement; keep the empty-required block in `wizard-validation.ts`.
- [x] 4.5 Submit the normalized (uppercase) course number through the hidden field.

## 5. Server

- [x] 5.1 Keep `assertKbemsDetails` empty-only and store the normalized `course_number` as-is; do not shape-block server-side.

## 6. Tests

- [x] 6.1 Unit-test the format helper: valid values, wrong type letter, wrong segment widths, lowercase accepted, and a custom TEI prefix.
- [x] 6.2 Unit-test the recent-numbers derivation: distinct values, most-recent order, five-item cap, and empty values excluded.
- [x] 6.3 Extend `src/modules/classes/wizard-validation.test.ts` to confirm the initial-cert rule remains empty-only.
- [x] 6.4 Extend `tests/e2e/class-wizard-course-number.spec.ts`: initial cert suppresses the Fire prefill, a malformed value warns and advances on acknowledgement, recents are offered, and the configured TEI is the expected prefix.
- [x] 6.5 Add coverage that an administrator can change the TEI and a non-administrator cannot.

## 7. Verification

- [x] 7.1 Run lint, typecheck, and the unit and integration suites.
- [x] 7.2 Run the affected Playwright specs. (environment-gated: specs collect cleanly; run requires E2E_DATABASE_URL and credentials, which are unset in this environment)
