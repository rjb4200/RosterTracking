## Why

Entering a class or session duration currently takes two separate controls, and the shared `.select-input` full-width rule makes each dropdown stretch and stack when the section narrows. Staff have to make two choices for one value, and the layout draws more attention to the controls than to the duration itself.

## What Changes

- Replace the hours and minutes selects with one duration select covering `30m` through `16h` in 15-minute steps.
- Format every option with the app's existing duration formatting (`2h 30m`, `16h`).
- Default a new class and a new session to `2h`.
- Make the duration select content-sized rather than full width, so it no longer stretches or stacks.
- Use the same control in class creation, session editing, and the post-class workspace.
- When editing a session whose stored duration is outside `30m`–`16h` (for example `15m` or `20h`), include that current value as an extra option so editing does not silently clamp it.
- Keep the submitted value as decimal hours; server validation and stored data are unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `class-creation-wizard`: the scheduled duration is chosen from one combined picker limited to `30m`–`16h` in 15-minute steps, still defaulting to two hours.
- `class-management`: a session's credited hours are chosen from the same combined picker, including the out-of-range current-value fallback.
- `guided-roster-finalization`: correcting a session duration in the post-class workspace uses the same picker and preserves an out-of-range current value.

## Impact

- `src/app/staff/(protected)/classes/duration-fields.tsx`
- `src/app/staff/(protected)/classes/class-creation-wizard.tsx`
- `src/app/staff/(protected)/classes/component-form.tsx`
- `src/app/globals.css` (the two-control flex layout becomes a compact select)
- Unit and browser coverage for duration options, defaults, and fallback values
- No database, migration, API, or server-validation changes
