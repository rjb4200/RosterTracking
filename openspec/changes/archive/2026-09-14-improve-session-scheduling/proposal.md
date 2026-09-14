## Why

Class sessions currently permit arbitrary minute values and independently entered end times and credited hours. That allows schedules whose clock duration does not match the instructional credit reported on official rosters.

## What Changes

- Constrain session start-time selection to 15-minute increments.
- Default a newly added session to two credited hours.
- Make the session end time a non-editable value calculated from the selected start time and credited hours.
- Preserve the optional session title as the session label and official-roster component/objectives value, falling back to the course name when absent.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `class-management`: Define fixed-increment session starts and credit-hour-derived session end times.

## Impact

- Affects the staff class-session form, component input validation, component service behavior, and related tests.
- Existing stored session records remain intact; editing a draft session will apply the new calculated-end-time rule.
- Official roster PDF title behavior is documented but does not require a data migration.
