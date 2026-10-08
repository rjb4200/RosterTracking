## Why

The EMS (KBEMS) class step lets staff advance with every field blank: the EMS course name, course type, and description are all optional, and the course number is optional for every class type. An EMS class can therefore be created without the details its roster and completion certificate rely on, and an initial-certification class can be created without the course number it is required to carry.

## What Changes

- Require the EMS course name (which supplies the class name), the course type, and the course description/objectives on the KBEMS step.
- Require the course number only when the course type is Initial certification, and show that field only for that type.
- Block advancing the KBEMS step and identify each missing required input, consistent with the other wizard steps.
- Enforce the same requirements on class creation server-side, scoped to KBEMS classes, while leaving the completed-class edit path permissive.

## Capabilities

### New Capabilities
<!-- None: this tightens an existing wizard step. -->

### Modified Capabilities
- `class-creation-wizard`: the KBEMS step requires the EMS course name, course type, and description, and requires the course number only for initial-certification classes.

## Impact

- `src/modules/classes/wizard-validation.ts`: add a KBEMS step branch.
- `src/app/staff/(protected)/classes/class-creation-wizard.tsx`: required marks and the conditional course-number field.
- `src/modules/classes/services.ts`: scoped create-time validation for KBEMS classes.
- Spec `class-creation-wizard` (the "KBEMS destination step collects EMS course details" requirement).
- No schema or data migration; `course_type` and `course_number` already exist.
