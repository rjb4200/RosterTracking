## Why

The create-class start time offers every minute of the hour, even though the department schedules classes on 15-minute increments and most start on the hour. The per-session start field already hints at 15 minutes with a picker step, but the create-class field does not, so the two surfaces disagree and staff must scroll past 59 irrelevant options. Nothing in the system enforces the cadence, so an off-grid time can also be typed or posted directly.

## What Changes

- Create-class start time accepts only 15-minute increments and defaults to the nearest quarter hour, rounded to the nearest.
- The start time rounds visibly: a typed or pasted off-grid value snaps to the nearest 15-minute value in the field.
- Session start times follow the same rounding, closing the gap between the picker hint and any typed value.
- The domain normalizes every class and session start time to the nearest 15-minute value, so the cadence holds regardless of how the value was supplied.
- A rounded value may roll into the next day; that is accepted rather than prevented.

## Capabilities

### New Capabilities

<!-- None: this adds a rule to existing class scheduling behavior. -->

### Modified Capabilities

- `class-management`: class and session start times are normalized to 15-minute increments, and the create-class start time is entered on that cadence.

## Impact

- **Time helper**: `roundDepartmentDateTimeToQuarterHour` (`src/modules/classes/time.ts`) already rounds to the nearest quarter hour but is only used to seed default values; it becomes the shared primitive for both entry and normalization.
- **Queue/domain input**: the class and session start schemas in `src/modules/classes/services.ts` normalize the parsed value instead of trusting the entered minute.
- **Create-class wizard**: the Date and start time input gains a 15-minute step, a rounded default, and round-on-change so the value is visible.
- **Session form**: the Starts input rounds on change to match its existing picker step.
- **Unchanged**: end times remain derived as start plus credited hours, and `creditedHours` already steps by 0.25, so ends stay on the same cadence without separate handling.
- **No schema change** and no migration; the rule is applied at input.
- **Out of scope**: changing which times are allowed beyond the increment (for example, restricting starts to the top of the hour).
