## Why

The KBEMS step hides the course number for every course type except Initial certification, so a dual Fire+EMS class cannot carry the Fire training code as its course number without a manual edit after creation. Staff also want the field available — but not required — for Continuing education and Refresher classes.

## What Changes

- The KBEMS step always offers a Course number field, and it stays required only for Initial certification.
- For Continuing education and Refresher the field renders with muted styling but remains a normal editable input (never `disabled`); the step no longer requires it.
- When both Fire and KBEMS are selected, the field is pre-filled from the first Fire subject's training code. Staff can overwrite the value; it is seeded once and not continuously mirrored.
- A KBEMS-only class leaves the field blank for the instructor to fill.
- The behavior applies at class creation (the wizard) only; the class edit form is unchanged.

## Capabilities

### New Capabilities

<!-- None: this change modifies existing behavior. -->

### Modified Capabilities

- `class-creation-wizard`: the KBEMS destination step changes how it offers and requires the Course number, and adds autofill from the Fire training code when both destinations are selected.

## Impact

- Wizard UI: `src/app/staff/(protected)/classes/class-creation-wizard.tsx` (KBEMS step controls, review list, hidden fields).
- Client validation: `src/modules/classes/wizard-validation.ts` (KBEMS step course-number rule).
- Creation service: `src/modules/classes/services.ts` (`assertKbemsDetails` course-number rule).
- Spec: `openspec/specs/class-creation-wizard/spec.md` (requirement "KBEMS destination step collects EMS course details").
- Tests: `src/modules/classes/wizard-validation.test.ts`, `tests/integration/ems-course-details.test.ts`, and the class-creation wizard end-to-end coverage.
