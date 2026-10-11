## 1. KBEMS step course-number field

- [x] 1.1 Render the course-number `Input` on the KBEMS step unconditionally (remove the `courseType === "initial_certification"` guard in `class-creation-wizard.tsx`).
- [x] 1.2 Show the required marker and normal styling only when `courseType === "initial_certification"`; otherwise apply the muted class while keeping the input editable (never `disabled`).
- [x] 1.3 Add a short optional hint/helper for the non-initial state if the muted styling alone is ambiguous.

## 2. Fire-to-EMS autofill

- [x] 2.1 Add a `courseNumberTouched` flag to wizard state, set when staff edit the course-number field.
- [x] 2.2 When both Fire and KBEMS are selected and the first Fire subject's `trainingCodeId` is set/changed, seed `courseNumber` from that training code's `code` via the `trainingCodes` prop, only while the field is untouched.
- [x] 2.3 Verify a manual edit is retained and not overwritten on subsequent renders, and that clearing the field manually does not trigger a re-seed.

## 3. Submit serialization and review

- [x] 3.1 Always render the hidden `courseNumber` input for KBEMS classes (remove the initial-certification guard).
- [x] 3.2 Confirm the review step shows the course number (with the "Not provided" fallback) for KBEMS classes regardless of course type.

## 4. Validation and service

- [x] 4.1 Confirm `wizardStepErrors` and `assertKbemsDetails` still require the course number only for initial certification; make no rule change unless verification shows otherwise.

## 5. Tests

- [x] 5.1 Update/extend `src/modules/classes/wizard-validation.test.ts` to cover the course number being optional for non-initial KBEMS classes.
- [x] 5.2 Extend `tests/integration/ems-course-details.test.ts` to cover a non-initial class accepted with and without a course number (existing coverage retained).
- [x] 5.3 Add wizard end-to-end coverage: the course number field is present for a Refresher class, and a dual Fire+EMS class pre-fills it from the Fire training code and retains a manual overwrite.

## 6. Verification

- [x] 6.1 Run lint and static type checking.
- [x] 6.2 Run the deterministic unit/integration suite and the class-creation wizard end-to-end suite.
