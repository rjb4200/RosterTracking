## 1. Curricula catalog

- [x] 1.1 Add a `curricula` table (publisher, program title, version, additional requirements, source revision, active)
- [x] 1.2 Add an idempotent import keyed by publisher, program title, and source revision
- [x] 1.3 Import the approved curriculum list (`aug2024`) and verify counts against the source
- [x] 1.4 Add curriculum search for class creation

## 2. Fire subject data

- [x] 2.1 Add `training_code_id`, `class_name`, `curriculum_id`, `lesson_plan`, and `method` to `class_components`
- [x] 2.2 Backfill existing components' class name and category from the course where available
- [x] 2.3 Persist Fire subject fields from class creation and setup edits
- [x] 2.4 Extend the finalization snapshot with subject and instructor-certification facts

## 3. Fire step in the wizard

- [x] 3.1 Add up to two Fire subject rows to the Fire step
- [x] 3.2 Wire the searchable training-code dropdown and pre-fill the editable class name
- [x] 3.3 Wire the searchable approved-curricula dropdown
- [x] 3.4 Add the free-text lesson plan
- [x] 3.5 Validate that each subject row has a category and class name

## 4. KFS-1A output

- [x] 4.1 Extend the KFS-1A mapping with Category, Curriculum, method, and instructor FFN/level fields
- [x] 4.2 Populate both subject rows and the instructor certification fields from revision facts
- [x] 4.3 Leave Date Entered and Entered By blank and write the generation audit event
- [x] 4.4 Run the visual fixture review for the mapping change

## 5. Verification

- [x] 5.1 Unit tests for curriculum import idempotency, class-name pre-fill, and subject validation
- [x] 5.2 Integration tests for Fire subject persistence and the finalization snapshot
- [x] 5.3 Browser coverage for the Fire step with one and two subjects
- [x] 5.4 Run `npm run check` and `npm run build`
