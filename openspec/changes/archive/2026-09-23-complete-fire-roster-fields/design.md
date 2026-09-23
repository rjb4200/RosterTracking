## Context

See `proposal.md` — Why.

Current state that shapes the approach:

- `TEMPLATE_MAPPINGS["kfs-1a"]` defines `className`, `component` (lesson plan), `start`, `end`, `hours` but **no** `CategoryRow1/2` or `CurriculumRow1/2`; `fillKfsPage` writes only the first subject row.
- The KFS-1A AcroForm exposes `CategoryRow1/2`, `Class NameRow1/2`, `CurriculumRow1/2`, `Lesson PlanRow1/2`, `FFN`, `FFN_2`, and Level/Method checkboxes.
- `class_components` stores `title`, `startsAt`, `endsAt`, `creditedHours` — the "lesson plan" is currently the free-text `title`.
- `training_codes` exists (code, title, source revision) but there is no curriculum catalog.
- Instructor FFN and level are added by `add-instructor-profiles`.
- The KFS-1A template is checksum-governed; mapping changes require a visual fixture review.

## Goals / Non-Goals

**Goals:**
- Give every KFS-1A subject row its category, class name, curriculum, and lesson plan.
- Print instructor FFN and certification level.
- Support up to two subjects per roster.
- Leave entry/signature fields blank and audit generation.

**Non-Goals:**
- Not changing the KBEMS-E16 output (that is `add-ems-completion-certificate` and its roster).
- Not generating KFS-1B Training Notices (still deferred).
- Not auto-deriving "Date Entered / Entered By" from the reporting queue at print time — they stay blank.
- Not building a curriculum administration UI beyond search/selection; import is seeded.

## Decisions

### D1 — A curricula catalog seeded from the approved list
New `curricula` table: `publisher`, `programTitle`, `version`, `additionalRequirements`, `sourceRevision`, `isActive`. Import is idempotent keyed on `(publisher, programTitle, sourceRevision)`.

- **Why**: the approved list is the authoritative set the roster's "Curriculum" field refers to, and it is reused across classes.
- **Alternatives**: free-text curriculum (drifts and cannot be validated against the approved list); storing curriculum on the course only (subjects differ within a class).

### D2 — Fire subject fields live on the class session
Extend `class_components` with `trainingCodeId`, `className`, `curriculumId`, `lessonPlan`, and `method`. A "Fire subject" is a session carrying these fields.

- **Why**: the KFS-1A subject row includes Start/End/Hours, so the subject *is* the session; extending it keeps one row per roster line and matches the two-row form.
- **Alternatives**: a separate `class_fire_subjects` table (splits schedule from subject, two tables to keep in sync); put category/curriculum on the course (cannot express two categories per day, which the sample form shows).
- The existing `title` remains the session label; `lessonPlan` is the roster's Lesson Plan value and falls back to the course name when empty, preserving current behavior.

### D3 — Cap Fire subjects at two in the wizard, not the schema
The wizard offers at most two Fire subject rows because the KFS-1A supports two. The schema does not cap component count (other delivery contexts may add sessions).

- **Why**: the constraint is a form limitation, not a data one.
- **Alternatives**: a database check capping components at two (over-constrains non-Fire classes).

### D4 — Class Name pre-fills from the training code but stays editable
Selecting a training code sets `className` from the code's title; the field remains a text input and the training-code reference is independent.

- **Why**: matches the requested behavior and keeps the category exact even when the display name is customized.
- **Alternatives**: lock the class name to the code title (too rigid for local naming).

### D5 — Instructor certification facts are snapshotted, not joined at print time
Finalization copies each instructor's name, FFN, and level into the revision; the renderer reads the revision only.

- **Why**: matches the existing "official rosters use finalized revision facts" contract and survives later profile edits.
- **Alternatives**: join `users` at generation (breaks immutability).

### D6 — Entry fields stay blank; generation is audited
`Date Entered` and `Entered By` are not written. An audit event records the generation and that these fields were left blank.

- **Why**: the roster is produced before reporting; the reporting queue captures the eventual entry actor and timestamp separately.

### D7 — A second Fire subject is auto-placed after the first
Each Fire subject row becomes its own class session. At class creation the first subject uses the class-and-schedule start and duration, and a second subject starts when the first ends with the same credited hours. The one-roster-day rule still holds because the second slot is sequential.

- **Why**: the form gives each subject row its own Start/End/Hours, but the wizard collects one class schedule; auto-placing keeps creation simple for the common single-subject case while still producing a valid two-row roster.
- **Alternatives**: collect per-subject times in the Fire step (more fields, but allows differing times — deferred); capture only the first subject at creation and add the second later (leaves the wizard unable to express the common two-subject day).
- **Follow-up**: staff can adjust the second session's times on the class edit page.

## Risks / Trade-offs

- **Mapping change on a checksum-governed template** → keep the approved template file and checksum unchanged; only field population changes, and a visual fixture review is part of the tasks.
- **Two subject rows but one session each** → a class with more than two components still prints only two Fire rows; document this and cap the wizard at two.
- **Curriculum list revisions** → keyed by source revision, so a new list imports alongside the old without mutating history.
- **Instructor facts captured at finalization may be incomplete** → output prints blank fields rather than failing, and staff can reopen to correct.

## Migration Plan

1. Add the `curricula` table and import the approved list.
2. Add the Fire subject columns to `class_components`; backfill class name and category from the course where available.
3. Extend the finalization snapshot with subject and instructor-certification facts.
4. Update the KFS-1A mapping and renderer; run the visual fixture review.
5. Update the wizard Fire step to collect up to two subject rows.
6. **Rollback**: revert the commit; added columns are nullable and the snapshot extension is optional.

## Open Questions

None blocking.
