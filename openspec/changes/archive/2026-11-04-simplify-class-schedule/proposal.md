# Proposal

## Why

The schedule currently treats every subject as an independently timed session. In practice the supported classes are one roster day with sequential subject blocks, and the extra start-time controls create edge cases for class creation, editing, and roster output. One class start with a duration per subject is simpler and still preserves the subject facts the KFS-1A and training notices need.

## What Changes

- **BREAKING** Remove independent session start times. A class has one start time.
- Keep ordered subject rows, but give each subject its own duration and derive every start and end time sequentially from the class start. No gaps are allowed.
- Set the class scheduled total to the sum of subject durations.
- Use the class delivery methods as one method set for the class; remove per-subject method overrides.
- Keep two Fire subject rows as the maximum for Fire output, matching the KFS-1A.
- Treat the ordered rows as subject blocks in the UI and storage rather than independently scheduled sessions.
- Normalize an existing open class's times to the sequential model when it is next edited. Finalized revisions keep their historical facts unchanged.
- Preserve reports, certificates, and Fire output behavior: they continue to use the subject durations and the class total, but no longer need a session-selection rule for the one-day roster.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `class-management`: class scheduling becomes one start time plus ordered subject durations, derived sequential times, a summed class total, and a class-level method set.
- `class-creation-wizard`: the class-and-schedule step captures one start time, subject durations are captured on the subject rows, and the reviewed class uses the derived total.
- `guided-roster-finalization`: the schedule editor shows derived times and edits subject durations, rather than independent session starts or per-session methods.

## Impact

- Class creation wizard state, validation, and submission.
- Session editor and schedule summary.
- Class service scheduling, duration, and method handling.
- Finalization snapshots continue to store each subject's derived times.
- Existing open classes are normalized on edit; no database migration is required.
- Unit and browser tests for single- and dual-subject classes, derived times, summed totals, and class-level methods.
