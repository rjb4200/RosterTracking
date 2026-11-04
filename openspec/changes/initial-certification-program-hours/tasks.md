# Tasks

## 1. Program catalog and categories

- [x] 1.1 Add the initial-certification program reference data for EMR (40), EMT-B (160), and AEMT (190), each linked to a fixed EMS category, and verify the fixed rows are seeded.
- [x] 1.2 Flag the program categories so the EMS category picker offers them only for Initial certification classes, and verify continuing-education and refresher pickers exclude them.

## 2. Class creation

- [x] 2.1 Add the Initial-certification program selector to the KBEMS step and verify EMR, EMT-B, and AEMT appear with their fixed hours.
- [x] 2.2 Autofill the EMS category and course name from the selected program and verify the course number remains separate.
- [x] 2.3 Use the program start date and program hours in the class-and-schedule step, hide the one-day duration, and verify the reviewed class shows the program total.
- [x] 2.4 Block Fire combined with an initial-certification program and verify the wizard explains the KBEMS-only rule.

## 3. Class storage, scheduling, and credit

- [x] 3.1 Store the selected program on the class and create one program block with credited hours equal to the program hours; verify with an integration test.
- [x] 3.2 Exempt an initial-certification program block from the one-day roster rule and verify a program spanning multiple days saves successfully.
- [x] 3.3 Default participant attendance credit to the program hours and verify the existing per-participant credit adjustment still works.

## 4. Certificates, transcripts, and review

- [x] 4.1 Use the program hours on initial-certification certificates and verify the certificate class-hours field.
- [x] 4.2 Verify initial-certification transcripts use the same program hours.
- [x] 4.3 Present the program and fixed hours in the review workspace instead of the duration picker and verify the review summary.

## 5. Verification

- [x] 5.1 Run `npm run check`, `npm run test`, and the focused integration tests.
- [x] 5.2 Run the class-creation and review browser coverage for all three programs.
- [x] 5.3 Run `openspec validate initial-certification-program-hours --strict`.

## Workflow follow-up

- Implement the daily-class-check-ins change after this change lands.
- Archive this change after review and verification pass.


