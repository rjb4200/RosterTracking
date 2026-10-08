## 1. Wizard validation

- [x] 1.1 Add a `kbems` branch to `wizardStepErrors` that requires the EMS course name, course type, and description, and requires the course number only when the course type is Initial certification

## 2. Wizard UI

- [x] 2.1 Mark the EMS course name, course type, and description as required and show the course number field only when the course type is Initial certification
- [x] 2.2 Pass the KBEMS values (course name, course type, description, course number) into the wizard validation input and highlight missing fields

## 3. Server enforcement

- [x] 3.1 Reject creation of a KBEMS class missing the required EMS details in `createOpenClass`, leaving the edit path permissive

## 4. Verification

- [x] 4.1 Add unit tests for the KBEMS step validation (required fields and the initial-certification course number)
- [x] 4.2 Add an integration test that creation rejects a KBEMS class missing required details and accepts a valid one
- [x] 4.3 Run `npm run check`, `npm run test`, and `npm run test:integration`
