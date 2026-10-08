## Context

The KBEMS step in the class-creation wizard collects the EMS course name, course type, course number, and description/objectives, but it has no validation: `wizardStepErrors` (`wizard-validation.ts`) only handles `destinations`, `fire`, and `class`, so the step advances with every field blank. The server schema is equally permissive (`services.ts:115-122`). The `class-creation-wizard` spec codifies the permissiveness with a "Leave the course number optional" scenario. The course-type enum already distinguishes `initial_certification` from `continuing_education` and `refresher`, so the trigger for the course-number requirement already exists. Only the completion certificate prints the course type and course number; the KBEMS-E16 roster prints the description.

## Goals / Non-Goals

**Goals:**
- Require the EMS course name (which supplies the class name), the course type, and the description on the KBEMS step.
- Require the course number only for Initial-certification classes and not offer it for the other types.
- Enforce the same rules when a KBEMS class is created.

**Non-Goals:**
- Changing the certificate or roster layout, or adding a schema/migration.
- Tightening the completed-class edit path, which does not collect these fields.
- Changing the Fire, MTU, or class-and-schedule steps.

## Decisions

**D1 — The trigger is `courseType === "initial_certification".`** The existing course-type enum already names the initial-certification case, so no new field or flag is needed.

**D2 — The course number field is shown only for Initial certification.** Staff "only need the course number for initial certifications," so the field is hidden for Continuing education and Refresher and required for Initial certification. Alternative: always show it and require it only for initial certification — rejected as clutter that invites entry on the wrong types.

**D3 — Required EMS fields are the course name, course type, and description.** These feed the class name, the certificate's course-type label, and the KBEMS-E16 roster's description.

**D4 — Client validation is a new `kbems` branch in `wizardStepErrors`.** It mirrors the other steps: return stable missing-field keys (`kbemsCourseName`, `courseType`, `objectives`, and `courseNumber` when initial certification), block advancement, and highlight the fields.

**D5 — Server enforcement is scoped to class creation.** `createOpenClass` rejects a KBEMS class missing the required fields, while the completed-class edit path (which does not collect these fields) stays permissive. This prevents a direct or API submission from bypassing the wizard without breaking class edits.

**D6 — No schema or data migration.** `course_type` and `course_number` already exist; existing EMS classes with blanks are unaffected.

## Risks / Trade-offs

- [Changing the course type hides a typed course number] → The value is retained in state and reappears if Initial certification is chosen again; the field is only required for that type.
- [Combined Fire + KBEMS classes] → The class name still resolves from the EMS course name; requiring it guarantees a non-empty name.
- [Server rule could reject an edit] → Enforced only on create; edits remain permissive.

## Migration Plan

UI and validation only; no data change. Deploy with the code. Rollback is reverting the commit.
