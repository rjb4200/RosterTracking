## 1. Data model

- [x] 1.1 Add nullable `classes.name`
- [x] 1.2 Backfill `classes.name` from `courses.name` for existing classes
- [x] 1.3 Drop `classes.course_id`, `course_reporting_defaults`, and `courses`
- [x] 1.4 Remove the `courses`/`courseReportingDefaults`/`courseId` schema definitions and the `classes_course_id_fk`

## 2. Read paths

- [x] 2.1 `listClasses`: replace the course join with `classes.name` and search by class or site
- [x] 2.2 `listOperationalClasses` and `listPublicOpenClasses`: select `classes.name`
- [x] 2.3 `buildSnapshot`: set `class.courseName` from `classes.name`
- [x] 2.4 `listReportingQueue`: show the class name
- [x] 2.5 `getClassDetail` and the class list/detail/review titles: use the class name

## 3. Class creation and editing

- [x] 3.1 Remove the Course select (and course search) from the wizard's class-and-schedule step
- [x] 3.2 Add the EMS course name as free text on the KBEMS step
- [x] 3.3 Show a class name field on the class-and-schedule step when neither Fire nor KBEMS is selected
- [x] 3.4 Default the scheduled duration to two hours
- [x] 3.5 Derive `classes.name` at creation from the destination (EMS course name, else first Fire subject, else the entered name)
- [x] 3.6 Persist the class name on the class edit form and keep it in step with the EMS course name and the first Fire subject
- [x] 3.7 Remove the Course select and the course-reporting-defaults reset from the class edit form

## 4. Fire subject pickers

- [x] 4.1 Select the first matching training code into the Category field as staff type, pre-filling the Class Name
- [x] 4.2 Select the first matching curriculum into the Curriculum field as staff type
- [x] 4.3 Keep the current selection when a search matches nothing

## 5. Retire the catalog surface

- [x] 5.1 Delete `src/app/staff/(protected)/courses/*` and the Courses nav item
- [x] 5.2 Remove `createCourse`/`listCourses`/`courseInput` and the course seed definitions
- [x] 5.3 Remove the `courses.manage` permission and its role grants
- [x] 5.4 Update the `course-catalog` main spec Purpose to drop course definitions

## 6. Tests

- [x] 6.1 Unit tests for the class-name precedence, the two-hour default, and the first-match pickers
- [x] 6.2 Integration tests for class creation by destination (Fire, EMS, MTU-only) and the finalization snapshot name
- [x] 6.3 Update fixtures that insert `courses` or assert a course-based class name
- [x] 6.4 Browser coverage for naming Fire, EMS, and MTU-only classes

## 7. Verification

- [x] 7.1 Run `npm run check` and `npm run build`
- [x] 7.2 Run the integration and browser suites
