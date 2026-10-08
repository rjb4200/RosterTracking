## Why

The Course catalog no longer earns its place. Fire rosters take their class name from the Fire subject rows, and the only thing EMS still needs from a course is a name for the certificate and the KBEMS-E16 — a single value, not a reusable catalog. Keeping `courses` forces every Fire class to carry a meaningless reference and makes `courses.name` the class's identity in five read paths (class list, operational dashboard, public directory, finalization snapshot, reporting queue).

## What Changes

- **BREAKING (data)**: retire the Course catalog — drop `courses`, `classes.course_id`, and `course_reporting_defaults`; remove the Courses admin screen, the `courses.manage` permission, and course seeding.
- Add **one class name** (`classes.name`), sourced by destination:
  - **Fire** → the first Fire subject's Class Name,
  - **EMS** → the course name entered for the certificate,
  - **MTU only** → a typed Class name (special case when neither Fire nor EMS is selected).
- Gather the **EMS course name** on the KBEMS step (its `Course type` and `Course number` are already captured) and use it for the KBEMS-E16 `Course Name` and the certificate's `<type> – <course>` line.
- **Default the scheduled duration to 2 hours**, replacing `course.defaultHours`.
- Remove the Course select from the wizard's class-and-schedule step and the class edit form, and stop resetting destinations when a course changes.
- Fix the Fire subject pickers: typing in the training-code or curriculum search selects the **first matching option** into the field, instead of leaving the placeholder until staff open and choose it.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `course-catalog`: retire course definitions and course search; keep training codes and training sites.
- `class-management`: a class's name replaces the required course, and class/session/list wording follows.
- `class-creation-wizard`: the class-and-schedule step loses Course; the KBEMS step gains the course name; the MTU-only class name; the 2-hour default.
- `completion-certificates`: the certificate's course name comes from the class name.
- `finalization-reporting`: the reporting queue shows the class name.
- `live-class-command-screen`: the class page shows the class name.
- `public-class-directory`: entries disclose the class name.

## Impact

- **Schema**: drop `courses`, `classes.course_id`, `course_reporting_defaults`; add `classes.name`; the finalization snapshot's `class.courseName` becomes the class name.
- **Modules**: `classes/services.ts` and `classes/finalization.ts` (name source replaces five course joins; list search by class), `reference/services.ts` (drop course CRUD), `reference` seed and `staff-auth` permissions.
- **Routes/UI**: delete `src/app/staff/(protected)/courses/*` and the nav item; wizard KBEMS step and MTU-only name; class edit form.
- **Data migration**: existing classes keep a name derived from their current course (`classes.name := courses.name`) before `course_id` is dropped; the class name survives even where the catalog row does not.
- **Tests**: class fixtures that insert `courses` and assert a course-based class name are updated to the name model.
