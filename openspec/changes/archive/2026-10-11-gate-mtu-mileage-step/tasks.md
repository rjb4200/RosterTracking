## 1. Validation rule

- [x] 1.1 Extend `WizardValidationInput` in `src/modules/classes/wizard-validation.ts` with the MTU fields the rule needs (current mileage and a boolean that a selected transport entry requires mileage).
- [x] 1.2 Add an `mtu` branch to `wizardStepErrors` that reports `mtuMileage` as missing when the driving-mileage flag is set and the mileage estimate is empty.
- [x] 1.3 Add unit tests to `wizard-validation.test.ts` covering: required-and-empty blocks, required-and-provided passes, and no driving transport passes.

## 2. Wizard wiring

- [x] 2.1 In `class-creation-wizard.tsx`, compute whether a selected transport entry requires mileage from `mtuCatalog` and `values.mtuUsage.transportIds` (the same inputs `MtuUsageFields` uses for `drivingSelected`).
- [x] 2.2 Pass the computed flag and `values.mtuUsage.mileage` into `validationInput`.
- [x] 2.3 Render the MTU step's mileage error through the existing `errors.includes("mtuMileage")` contract; keep the block/advance behavior driven by `next()`.

## 3. Mileage field presentation

- [x] 3.1 Add an optional invalid signal (for example `mileageInvalid`) to `MtuUsageFields` and render `aria-invalid` on the mileage input when set.
- [x] 3.2 Pass the invalid signal from the wizard when `errors.includes("mtuMileage")`.
- [x] 3.3 Remove or neutralize the inert `required={drivingSelected}` on the mileage input so the wizard rule is the single source of truth.

## 4. End-to-end coverage

- [x] 4.1 Extend `tests/e2e/class-wizard-required.spec.ts` (or add a sibling) to select a driving transport on the MTU step, attempt Next with blank mileage, and assert the wizard stays put with the field marked.
- [x] 4.2 Assert the step advances after a mileage estimate is entered.
- [x] 4.3 Confirm the server-side create-only behavior is untouched (existing `mtu-catalog` integration test still passes).

## 5. Verify

- [x] 5.1 Run lint and typecheck.
- [x] 5.2 Run the `wizard-validation` unit tests and the updated e2e wizard test.
- [x] 5.3 Confirm `openspec validate gate-mtu-mileage-step --strict` passes.
