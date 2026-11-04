## Context

The app schedules a class as one roster day with ordered subject durations. The certificate and transcript hours come from those durations. EMR, EMT-B, and AEMT are multi-week KBEMS initial-certification programs with fixed totals of 40, 160, and 190 hours, so they cannot use that schedule model as-is. The EMS category catalog also has no initial-certification categories.

## Goals / Non-Goals

**Goals:**

- Define EMR, EMT-B, and AEMT as fixed initial-certification programs with 40, 160, and 190 hours.
- Give each program a fixed EMS category that is only offered for initial-certification classes.
- Autofill the category, EMS course name, and program hours when staff select a program.
- Store the program on the class and use its hours for the class total, attendance credits, certificates, and transcripts.
- Represent an initial-certification class as one program block that may span days or weeks, without daily session rows.
- Keep this mode KBEMS-only for now.

**Non-Goals:**

- Daily check-ins; that is a separate change.
- Fire subjects combined with an initial-certification program.
- A general multi-day scheduling system for other classes.
- Editing the fixed program catalog or hours from the UI.
- Changing non-initial certificate or transcript behavior.

## Decisions

### Fixed program reference data

Add an `initial_certification_programs` reference table with fixed rows:

| Code | Title | Hours | Category |
|---|---|---:|---|
| `emr` | EMR | 40 | fixed EMR category |
| `emt_b` | EMT-B | 160 | fixed EMT-B category |
| `aemt` | AEMT | 190 | fixed AEMT category |

Each program references its EMS training-code category. The fixed rows are seeded and not editable from the application. The category picker filters by course type: initial-certification classes see only the program categories, and continuing-education classes exclude them. This is the program/category flag; no separate catalog entry is offered in both modes.

Alternative considered: reuse existing CE categories such as Medical or Airway. Rejected because the program, hours, and category would not be tied together and the category would not identify the program.

### One program block, not daily sessions

Store one `class_components` row for the program with:

```text
startsAt = program start
creditedHours = program hours
endsAt = startsAt + program hours
```

The component is the program's duration; it is allowed to span multiple department-calendar days. The same-day rule is exempt for initial-certification classes. The class remains open until the program is finalized, so the existing sign-in access can be used for the program.

Alternative considered: add daily session rows. Rejected for this change because the user does not need class days, and daily check-ins are a separate change.

Alternative considered: store program hours only as an override while keeping a one-day schedule. Rejected because the class total, attendance, certificate, and transcript would disagree about the class hours.

### Program hours drive all credited hours

The single program component gives the existing systems one consistent total:

- class scheduled total = program hours
- new attendance credit = program hours
- certificate class hours = program hours
- transcript hours = attendance credit = program hours

The instructor can still adjust an individual participant's credited hours through the existing review controls. The program hours are fixed for the class and are not edited by the duration picker.

### Autofill category and course name

Selecting a program sets the EMS category to the program's fixed category and the EMS course name to the program title. The category control is not separately chosen in initial-certification mode. The course number remains the existing required initial-certification number and is not auto-filled.

### KBEMS-only program mode

An initial-certification program class may not also select Fire. This avoids conflicting Fire subject durations and keeps the KFS-1A out of a program whose certificate is KBEMS-based. The wizard blocks the combination and explains it.

### Keep the existing one-day model for everyone else

Only initial-certification classes get the multi-day program block. The existing one-day rule remains for continuing-education, refresher, and Fire classes.

## Risks / Trade-offs

- **The program block spans weeks and the class stays open** → Sign-in access remains open until finalization; the follow-up daily-check-in change will document attendance dates.
- **Program hours and individual credit can differ** → The instructor retains the existing credit adjustment controls; the program total is the maximum.
- **Existing initial-certification classes have no program** → Do not guess a program. Leave legacy rows untouched; require a program when an initial-certification class is next edited or created.
- **Fixed categories could leak into CE pickers** → Filter by course type in both the client and server validation and test both directions.
- **A program block crossing multiple days violates the current roster-day validation** → Exempt only initial-certification classes and cover the exception with unit and integration tests.
- **No Fire roster for these programs** → Intentional for this phase; combining Fire and initial certification remains out of scope.

## Migration Plan

1. Add the program reference table and seed EMR, EMT-B, and AEMT with their fixed categories and hours.
2. Add the class program reference and migration for existing rows as nullable.
3. Update class creation, validation, review, certificate, and attendance paths.
4. Existing initial-certification rows remain readable; require a program on the next edit.
5. Rollback by reverting the code and leaving the new nullable reference columns unused; no destructive data migration is required.

## Open Questions

None.
