## Why

The class-creation wizard labels the MTU mileage estimate "(required)" when a driving transport is selected, but it never blocks advancing past the MTU step. The requirement is only enforced when the class is finally created, so staff fill in the rest of the wizard and then hit a rejection error that points at no field and does not return them to the step that needs fixing.

## What Changes

- The MTU step of the class-creation wizard now blocks **Next** until a mileage estimate is entered whenever a selected transport entry requires mileage (for example, the Ford Transit van). The step highlights the mileage field and shows the existing "Complete the highlighted fields." message, consistent with the other wizard steps.
- Deselecting the driving transport, or clearing the MTU destination, removes the requirement without any extra action.
- The mileage field is marked invalid visually in the same way other required wizard fields are.
- The server-side creation check stays as defense-in-depth; the spec's create-only rule (later edits, finalization, and post-finalization usage changes never enforce mileage) is unchanged.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `mtu-usage-tracking`: The existing requirement "A driving transport requires a mileage estimate at creation" gains an explicit wizard-step gate, so the requirement is enforced before staff can leave the MTU step rather than only at class creation.

## Impact

- `src/modules/classes/wizard-validation.ts` and its unit test: a new `mtu` validation branch and the MTU data it needs in `WizardValidationInput`.
- `src/app/staff/(protected)/classes/class-creation-wizard.tsx`: thread MTU usage/catalog into the validation input and surface the mileage error.
- `src/app/staff/(protected)/classes/mtu-usage-fields.tsx`: accept an invalid/error signal for the mileage field.
- `tests/e2e/class-wizard-required.spec.ts`: extend with MTU step coverage.
- No schema, API, or database changes. Server-side `assertCreationMileage` behavior is unchanged.
