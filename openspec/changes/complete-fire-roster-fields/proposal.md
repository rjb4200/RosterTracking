## Why

Generated KFS-1A rosters are incomplete. The form's subject rows need **Category, Class Name, Curriculum, and Lesson Plan**, and its instructor lines need each instructor's **FFN and certification level** — but the app prints none of these. `mappings.ts` never writes `CategoryRow*` or `CurriculumRow*`, there is no curriculum catalog, and staff users have no FFN or level. A class can also teach up to two subjects on one roster day, which the current model cannot express.

## What Changes

- Add an **approved curricula catalog** seeded from the state list (`approved-curricula-list-aug2024`): publisher, program title, version, additional requirements, source revision.
- Let the Fire step collect **up to two subject rows**, each with **Category** (searchable training code), **Class Name** (auto-filled from the code, editable), **Curriculum** (searchable approved-curricula dropdown), and **Lesson Plan** (free text).
- Store Fire subject fields on the class session so they survive to finalization.
- Populate the **KFS-1A Category, Class Name, Curriculum, Lesson Plan, and method** fields and the **instructor FFN and level** fields.
- Leave **Date Entered / Entered By** blank on the printed roster (entered later by Majors/Admins) and record that they were left blank in the audit log.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `course-catalog`: adds the approved-curricula catalog and its search.
- `class-creation-wizard`: the Fire step collects up to two Fire subject rows with the catalog-backed fields.
- `class-management`: class sessions retain Fire subject fields (category, class name, curriculum, lesson plan) and instructor certification details for official output.
- `official-roster-pdfs`: the KFS-1A populates category, curriculum, method, and instructor FFN/level fields, and leaves entry fields blank.

## Impact

- **Schema**: new `curricula` table seeded from the approved list; `class_components` gains `training_code_id`, `class_name`, `curriculum_id`, `lesson_plan`, and `method`; the finalization snapshot gains subject and instructor-certification facts.
- **Modules**: `reference-seed.ts` / `reference/services.ts` (curricula import and search), `classes/services.ts` (persist Fire subject fields), `official-roster-pdfs/mappings.ts` and `service.ts` (fill the missing fields), `class-creation-wizard.tsx` (Fire step).
- **Data migration**: backfill existing components' `class_name` from the class course name and `training_code_id` from the course's training code where available; leave curriculum and lesson plan null.
- **Governance**: the KFS-1A template mapping change requires a visual fixture review per the official-roster-pdfs rules.
- **Dependency**: instructor FFN/level come from `add-instructor-profiles`; the Fire step's placement comes from `rework-reporting-destinations`.
