# Proposal

## Why

EMR, EMT-B, and AEMT initial-certification programs require fixed totals of 40, 160, and 190 hours. The current one-day class model cannot represent those programs, the certificate hours come from the scheduled subject durations, and the EMS category picker has no initial-certification entries. Staff currently have to fit a multi-week program into a one-day schedule and manually type a course name.

## What Changes

- Add a fixed initial-certification program catalog: EMR (40 hours), EMT-B (160 hours), AEMT (190 hours).
- Add fixed initial-certification categories for those programs, flagged so they only appear for initial-certification classes.
- When KBEMS and Initial certification are selected, offer the program selector and auto-fill the EMS category, EMS course name, and program hours.
- Store the selected program and program hours on the class.
- Represent the program as one program-level duration instead of daily class days or subject sessions.
- Allow an initial-certification program block to span several days or weeks without creating daily session rows.
- Use the program hours as the class total, attendance credit default, certificate hours, and transcript hours.
- Keep initial-certification classes KBEMS-only for now; Fire subjects are not combined with this program mode.
- Leave non-initial classes, Fire scheduling, KFS-1A output, and the existing one-day subject model unchanged.
- No daily check-ins in this change; that is a separate follow-up.

## Capabilities

### New Capabilities

- `initial-certification-programs`: the fixed EMR/EMT-B/AEMT program catalog, category mapping, program hours, and the program-mode class behavior.

### Modified Capabilities

- `class-creation-wizard`: initial-certification KBEMS classes select a fixed program, auto-fill its category and course name, and use program hours instead of a one-day duration.
- `class-management`: an initial-certification class stores its program and may span days/weeks as one program block, exempt from the one-day subject rule.
- `attendance-sign-in`: initial-certification attendance credits the program hours rather than the scheduled day.
- `completion-certificates`: initial-certification certificates state the program hours.
- `guided-roster-finalization`: the review workspace presents program hours rather than a daily schedule for initial-certification classes.

## Impact

- New initial-certification program/category reference data and a migration.
- Class creation, class storage, scheduling validation, attendance credit, certificate hours, transcript hours, and review/readiness.
- Existing non-initial classes and Fire output remain unchanged.
- Fixed category rows must be seeded with the other reference data.
- Requires unit, integration, and browser coverage for all three programs.
